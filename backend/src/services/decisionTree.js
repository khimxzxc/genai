/**
 * ============================================================
 * Decision Tree — Детерминированная оценка + Агрегатор чанков
 * ============================================================
 * 
 * Два модуля:
 *   1. classifyQuality() — строгое дерево решений для грейда (v1, не изменено)
 *   2. aggregateChunkResults() — НОВЫЙ агрегатор для объединения
 *      JSON-ответов от нескольких чанков Gemini API
 * 
 * Агрегатор:
 *   - Объединяет feedback из всех чанков
 *   - Удаляет дубликаты ошибок по ключу (issue + category)
 *   - Считает scores через медиану (устойчива к выбросам)
 *   - Мерджит learningPathRecommendations (уникальные по topic)
 *   - Выбирает лучший nextAttemptSuggestion
 *   - Объединяет scoreJustifications
 * ============================================================
 */

/**
 * Детерминированное дерево решений для выставления финальной оценки и грейда.
 * Строгие пороги на основе экспертной шкалы (new.md v3).
 * 
 * Шкала:
 *   85–95 → "Өте жақсы"  (требуется: html ≥ 25, css ≥ 25, ui ≥ 33)
 *   70–84 → "Жақсы"       (требуется: html ≥ 20, css ≥ 20, ui ≥ 28)
 *   50–69 → "Қанағаттанарлық" (требуется: ui ≥ 18)
 *   0–49  → "Қанағаттанарлықсыз"
 * 
 * @param {Object} scores Объект с баллами { html, css, ui, total }
 * @returns {Object} { grade, reason }
 */
function classifyQuality(scores) {
  const html = Number(scores.html) || 0;
  const css  = Number(scores.css)  || 0;
  const ui   = Number(scores.ui)   || 0;
  let total  = Number(scores.total) || (html + css + ui);

  // Пересчитываем total если LLM ошибся в арифметике
  const calculatedTotal = html + css + ui;
  if (Math.abs(total - calculatedTotal) > 3) {
    total = calculatedTotal;
  }

  // Лимит 95 баллов (максимум по системе)
  if (total > 95) total = 95;

  // === СТРОГОЕ ДЕРЕВО РЕШЕНИЙ ===

  // Өте жақсы — все три компонента высокие
  if (total >= 85 && html >= 25 && css >= 25 && ui >= 33) {
    return { grade: 'Өте жақсы', reason: 'Барлық критерийлер бойынша жоғары сапа' };
  }

  // Жақсы — общий ≥ 70 и нет критических провалов
  if (total >= 70 && html >= 20 && css >= 20 && ui >= 28) {
    return { grade: 'Жақсы', reason: 'Жақсы сапа, шағын ескертулер бар' };
  }

  // Қанағаттанарлық — общий ≥ 50
  if (total >= 50 && ui >= 18) {
    return { grade: 'Қанағаттанарлық', reason: 'Елеулі мәселелер бар, жақсарту қажет' };
  }

  // Қанағаттанарлықсыз — всё остальное
  return { grade: 'Қанағаттанарлықсыз', reason: 'Стандарттарды сыни бұзу анықталды' };
}

// ═══════════════════════════════════════════════════════════════
// АГРЕГАТОР ЧАНКОВ — объединяет результаты параллельных вызовов
// ═══════════════════════════════════════════════════════════════

/**
 * Вычисляет медиану массива чисел.
 * Медиана используется вместо среднего, потому что устойчива к выбросам:
 * пустой <footer> может получить 5 баллов, а <main> — 28.
 * Среднее даст 16.5, медиана — ближе к реальности.
 * 
 * @param {number[]} values - Массив чисел
 * @returns {number} Медианное значение (округлённое)
 */
function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const result = sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(result);
}

/**
 * Генерирует уникальный ключ для ошибки — используется для дедупликации.
 * Ключ формируется из категории и первых 60 символов issue (нормализованных).
 * 
 * Пример:
 *   "HTML|img тегінде alt атрибуты жоқ" → одинаковый ключ
 *   из разных чанков будет удалён как дубликат.
 * 
 * @param {Object} item - Элемент feedback
 * @returns {string} Уникальный ключ
 */
function feedbackKey(item) {
  const category = (item.category || 'UI').toUpperCase();
  // Нормализуем issue: нижний регистр, убираем лишние пробелы, берём первые 60 символов
  const issue = (item.issue || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60);
  return `${category}|${issue}`;
}

/**
 * Главная функция агрегации — объединяет JSON-ответы от нескольких чанков Gemini.
 * 
 * Алгоритм:
 * 1. Собирает все feedback → удаляет дубликаты по ключу (issue + category)
 * 2. Собирает все scores → считает МЕДИАНУ для html, css, ui
 * 3. Мерджит learningPathRecommendations → уникальные по topic
 * 4. Выбирает лучший nextAttemptSuggestion (с макс. expectedImprovementPoints)
 * 5. Объединяет scoreJustifications (merge deductionReasons из всех чанков)
 * 
 * @param {Array<Object>} chunkResults - Массив JSON-ответов от Gemini (по чанку)
 * @returns {Object} Единый агрегированный результат
 */
function aggregateChunkResults(chunkResults) {
  if (!chunkResults || chunkResults.length === 0) {
    return {
      scores: { html: 0, css: 0, ui: 0, total: 0 },
      feedback: [],
      scoreJustifications: {},
      learningPathRecommendations: [],
      nextAttemptSuggestion: null,
    };
  }

  // Если только один чанк — возвращаем как есть (без агрегации)
  if (chunkResults.length === 1) {
    return chunkResults[0];
  }

  console.log(`[Aggregator] Агрегация ${chunkResults.length} ответов от Gemini...`);

  // ─── 1. SCORES: медиана по каждому компоненту ─────────────
  const htmlScores = [];
  const cssScores = [];
  const uiScores = [];

  chunkResults.forEach(result => {
    const isCssChunk = result.chunkType === 'css';
    if (result.scores) {
      if (!isCssChunk) {
        // Из HTML чанков берем ТОЛЬКО HTML оценки
        if (typeof result.scores.html === 'number') htmlScores.push(result.scores.html);
      } else {
        // Из CSS чанков берем ТОЛЬКО CSS и UI оценки
        if (typeof result.scores.css === 'number') cssScores.push(result.scores.css);
        if (typeof result.scores.ui === 'number') uiScores.push(result.scores.ui);
      }
    }
  });

  // Если вдруг CSS или HTML оценки пустые (например, не было CSS файлов), берем 0 как дефолт
  const html = htmlScores.length > 0 ? median(htmlScores) : 0;
  const css  = cssScores.length > 0  ? median(cssScores)  : 0;
  const ui   = uiScores.length > 0   ? median(uiScores)   : 0;
  let total  = html + css + ui;
  if (total > 95) total = 95; // Лимит системы

  console.log(`[Aggregator] Scores (медиана): HTML=${html}, CSS=${css}, UI=${ui}, Total=${total}`);

  // ─── 2. FEEDBACK: дедупликация по ключу с разделением ролей чанков ──
  const seenKeys = new Set();
  const allFeedback = [];

  chunkResults.forEach(result => {
    const isCssChunk = result.chunkType === 'css';
    if (Array.isArray(result.feedback)) {
      result.feedback.forEach(item => {
        const cat = (item.category || 'UI').toUpperCase();
        // Разделяем фидбек по чанкам:
        // HTML чанки не должны давать фидбек по CSS/UI
        // CSS чанки не должны давать фидбек по HTML
        if (!isCssChunk && (cat.includes('CSS') || cat.includes('UI'))) {
          return; // Пропускаем
        }
        if (isCssChunk && cat.includes('HTML')) {
          return; // Пропускаем
        }

        const key = feedbackKey(item);
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allFeedback.push(item);
        }
      });
    }
  });

  console.log(`[Aggregator] Feedback: ${allFeedback.length} уникальных (ролевые дубликаты отфильтрованы)`);

  // ─── 3. LEARNING PATH: уникальные рекомендации по topic ───
  const seenTopics = new Set();
  const allRecommendations = [];

  chunkResults.forEach(result => {
    if (Array.isArray(result.learningPathRecommendations)) {
      result.learningPathRecommendations.forEach(rec => {
        const topicKey = (rec.topic || '').toLowerCase().trim();
        if (topicKey && !seenTopics.has(topicKey)) {
          seenTopics.add(topicKey);
          allRecommendations.push(rec);
        }
      });
    }
  });

  // Сортируем по приоритету (1 = самый важный)
  allRecommendations.sort((a, b) => (a.priority || 99) - (b.priority || 99));

  // ─── 4. NEXT ATTEMPT SUGGESTION: берём с макс. ожидаемым улучшением ──
  let bestSuggestion = null;
  let maxImprovement = -1;

  chunkResults.forEach(result => {
    if (result.nextAttemptSuggestion) {
      const points = result.nextAttemptSuggestion.expectedImprovementPoints || 0;
      if (points > maxImprovement) {
        maxImprovement = points;
        bestSuggestion = result.nextAttemptSuggestion;
      }
    }
  });

  // Если есть несколько suggestions — объединяем changes
  if (bestSuggestion) {
    const allChanges = new Set(bestSuggestion.changes || []);
    chunkResults.forEach(result => {
      if (result.nextAttemptSuggestion?.changes) {
        result.nextAttemptSuggestion.changes.forEach(c => allChanges.add(c));
      }
    });
    bestSuggestion = { ...bestSuggestion, changes: [...allChanges] };
  }

  // ─── 5. SCORE JUSTIFICATIONS: объединяем deductionReasons по типу чанка ──
  const mergedJustifications = {
    html: { summary: '', maxScore: 30, earnedScore: html, deductionReasons: [] },
    css: { summary: '', maxScore: 30, earnedScore: css, deductionReasons: [] },
    ui: { summary: '', maxScore: 40, earnedScore: ui, assessmentBreakdown: [] },
  };

  // Собираем все deductionReasons и assessmentBreakdown из чанков
  const seenDeductionRules = new Set();

  chunkResults.forEach(result => {
    if (!result.scoreJustifications) return;
    const sj = result.scoreJustifications;
    const isCssChunk = result.chunkType === 'css';

    // HTML justifications (берём только из HTML чанков)
    if (sj.html && !isCssChunk) {
      if (sj.html.summary && !mergedJustifications.html.summary) {
        mergedJustifications.html.summary = sj.html.summary;
      }
      if (Array.isArray(sj.html.deductionReasons)) {
        sj.html.deductionReasons.forEach(dr => {
          const ruleKey = dr.rule || dr.ruleName || '';
          if (!seenDeductionRules.has(`html-${ruleKey}`)) {
            seenDeductionRules.add(`html-${ruleKey}`);
            mergedJustifications.html.deductionReasons.push(dr);
          }
        });
      }
    }

    // CSS justifications (берём только из CSS чанков)
    if (sj.css && isCssChunk) {
      if (sj.css.summary && !mergedJustifications.css.summary) {
        mergedJustifications.css.summary = sj.css.summary;
      }
      if (Array.isArray(sj.css.deductionReasons)) {
        sj.css.deductionReasons.forEach(dr => {
          const ruleKey = dr.rule || dr.ruleName || '';
          if (!seenDeductionRules.has(`css-${ruleKey}`)) {
            seenDeductionRules.add(`css-${ruleKey}`);
            mergedJustifications.css.deductionReasons.push(dr);
          }
        });
      }
    }

    // UI justifications (берём только из CSS чанков)
    if (sj.ui && isCssChunk) {
      if (sj.ui.summary && !mergedJustifications.ui.summary) {
        mergedJustifications.ui.summary = sj.ui.summary;
      }
      if (Array.isArray(sj.ui.assessmentBreakdown)) {
        sj.ui.assessmentBreakdown.forEach(ab => {
          const criterionKey = (ab.criterion || '').toLowerCase();
          if (!seenDeductionRules.has(`ui-${criterionKey}`)) {
            seenDeductionRules.add(`ui-${criterionKey}`);
            mergedJustifications.ui.assessmentBreakdown.push(ab);
          }
        });
      }
    }
  });

  console.log(`[Aggregator] Агрегация завершена. Grade будет определён Decision Tree.`);

  return {
    scores: { html, css, ui, total },
    feedback: allFeedback,
    scoreJustifications: mergedJustifications,
    learningPathRecommendations: allRecommendations,
    nextAttemptSuggestion: bestSuggestion,
  };
}

export { classifyQuality, aggregateChunkResults };
