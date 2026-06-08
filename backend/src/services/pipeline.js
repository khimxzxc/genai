/**
 * ============================================================
 * Pipeline v2 — Главный конвейер оценки с семантическим чанкингом
 * ============================================================
 * 
 * Двухрежимная система:
 *   Режим A (маленький файл): codeAnalyzer → retriever → callGemini → classifyQuality
 *   Режим B (большой файл):   codeAnalyzer → retriever → semanticChunker 
 *                              → callGeminiChunked (параллельно) → aggregateChunkResults 
 *                              → classifyQuality
 * 
 * Порог переключения: > 300 строк суммарно ИЛИ > 1 HTML файл
 * 
 * Перевод на казахский: вызывается один раз ПОСЛЕ агрегации,
 * чтобы не дублировать запросы к API перевода.
 * ============================================================
 */

import { retrieveRelevantContext } from './retriever.js';
import { callGemini, callGeminiChunked } from './geminiService.js';
import { classifyQuality, aggregateChunkResults } from './decisionTree.js';
import { analyzeProject } from './codeAnalyzer.js';
import { chunkCodeFiles } from './semanticChunker.js';

/**
 * Главный пайплайн оценки студенческой работы.
 * 
 * Поток данных:
 *   1. Статический анализ (codeAnalyzer) → метрики для ground truth
 *   2. RAG (retriever + Fuse.js) → контекст из базы знаний
 *   3. Определение режима: маленький файл → прямой вызов, большой → чанкинг
 *   4. Gemini API → JSON-оценка (на казахском)
 *   5. Агрегация (если чанкинг) → единый результат
 *   6. Decision Tree → детерминированный грейд
 * 
 * @param {Array<{path: string, content: string}>} codeFiles - Файлы студента
 * @param {string|null} screenshotBase64 - Скриншот от Puppeteer
 * @returns {Promise<Object>} Финальный результат оценки
 */
async function evaluateCode(codeFiles, screenshotBase64) {
  // ─── ШАГ 1: Статический анализ ────────────────────────────
  // Извлекаем реальные метрики из кода — они передаются в LLM как факты,
  // чтобы модель не «галлюцинировала» про наличие/отсутствие фич
  const staticMetrics = analyzeProject(codeFiles);
  console.log('[Pipeline] Шаг 1: Статический анализ завершён.', {
    semanticTags: staticMetrics.htmlMetrics?.semanticTagsCount,
    mediaQueries: staticMetrics.cssMetrics?.mediaQueriesCount,
    cssVars: staticMetrics.cssMetrics?.cssVarsCount,
    bemClasses: staticMetrics.cssMetrics?.bemClassesCount,
  });

  // ─── ШАГ 2: RAG — контекст из базы знаний ────────────────
  const context = retrieveRelevantContext(codeFiles);

  // ─── ШАГ 3: Определяем режим — чанкинг или прямой вызов ──
  const { needsChunking, chunks } = chunkCodeFiles(codeFiles);

  let reviewData;

  // === EDGE CASE: try/catch вокруг всех вызовов Gemini API ===
  // Если Gemini вернул сломанный JSON, упал по таймауту или выбросил ошибку —
  // возвращаем безопасный fallback, чтобы не ронять весь сервер
  try {
    if (needsChunking) {
      // ═══ РЕЖИМ B: Семантический чанкинг + параллельные вызовы ═══
      console.log(`[Pipeline] Шаг 3: РЕЖИМ ЧАНКИНГ — ${chunks.length} чанков`);

      // Параллельная отправка всех чанков в Gemini API
      const chunkResults = await callGeminiChunked(
        context, chunks, screenshotBase64, staticMetrics
      );

      // Агрегация: объединяем результаты, удаляем дубликаты, считаем медиану
      console.log('[Pipeline] Шаг 4: Агрегация ответов...');
      reviewData = aggregateChunkResults(chunkResults);

    } else {
      // ═══ РЕЖИМ A: Обычный вызов (маленький файл) ═══
      console.log('[Pipeline] Шаг 3: ОБЫЧНЫЙ РЕЖИМ — один вызов Gemini');
      reviewData = await callGemini(context, codeFiles, screenshotBase64, staticMetrics);
    }
  } catch (geminiError) {
    console.error('[Pipeline] ❌ Gemini API қатесі:', geminiError.message);

    // === FALLBACK: безопасный ответ при ошибке Gemini ===
    // Определяем тип ошибки для более точного сообщения
    const isTimeout = geminiError.message?.includes('Уақыт') || 
                      geminiError.message?.includes('timeout') ||
                      geminiError.message?.includes('AbortError');
    
    const errorMessage = isTimeout
      ? 'Сервермен байланыс үзілді. Уақыт шектеуі аяқталды, қайта байқап көріңіз.'
      : 'Gemini API қатесі орын алды. Жүйе қауіпсіз режимде жауап қайтарды.';

    reviewData = {
      scores: { html: 0, css: 0, ui: 0, total: 0 },
      feedback: [{
        category: 'UI',
        location: 'Жүйе',
        issue: errorMessage,
        howToFix: 'Жұмысты қайта жіберіп көріңіз. Мәселе қайталанса, оқытушыға хабарласыңыз.',
        studyMaterials: [],
      }],
      scoreJustifications: null,
      learningPathRecommendations: [],
      nextAttemptSuggestion: {
        focus: 'Қайта жіберу',
        expectedImprovementPoints: 0,
        changes: ['Жұмысты қайта тексеруге жіберіңіз'],
      },
      _fallback: true,
      _errorMessage: geminiError.message,
    };
  }

  // ─── ШАГ 4: Нормализация scores ──────────────────────────
  if (!reviewData.scores) {
    reviewData.scores = { html: 0, css: 0, ui: 0, total: 0 };
  }

  // ─── ШАГ 5: Санитизация категорий feedback ────────────────
  // Приводим category к строгому формату Prisma Enum: HTML | CSS | UI
  if (Array.isArray(reviewData.feedback)) {
    reviewData.feedback = reviewData.feedback.map(item => {
      const catLower = (item.category || 'ui').toLowerCase();
      let category = 'UI';
      if (catLower.includes('html')) category = 'HTML';
      else if (catLower.includes('css')) category = 'CSS';
      return { ...item, category };
    });
  }

  // ─── ШАГ 6: Decision Tree — детерминированный грейд ───────
  // classifyQuality НЕ доверяет грейду от LLM — пересчитывает по строгим порогам
  const final = classifyQuality(reviewData.scores);

  console.log(`[Pipeline] ✅ Результат: ${reviewData.scores.total} баллов → ${final.grade}`);

  return {
    ...reviewData,
    grade: final.grade || reviewData.grade,
    gradeReason: final.reason,
    isStable: true,
  };
}

export { evaluateCode };
