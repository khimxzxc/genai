/**
 * ============================================================
 * Gemini API сервис — v2 с поддержкой семантического чанкинга
 * ============================================================
 * 
 * Две стратегии вызова:
 *   1. callGemini()        — обычный вызов для маленьких файлов (< 300 строк)
 *   2. callGeminiChunked() — параллельная отправка чанков через Promise.allSettled()
 * 
 * Каждый параллельный вызов:
 *   - Имеет AbortController с таймаутом 30 секунд
 *   - Получает мини-промпт с контекстом чанка (тип, индекс, всего)
 *   - При ошибке не роняет остальные вызовы (settled, не all)
 * 
 * Температура 0.1 для максимальной детерминированности.
 * Используется Gemini 2.5 Flash.
 * ============================================================
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EXPERT_SYSTEM_PROMPT } from '../prompts/expertSystemPrompt.js';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/** Таймаут для одного вызова Gemini API (в мс) */
const GEMINI_TIMEOUT_MS = 30_000;

/**
 * Нумерует строки кода для точных ссылок в review.
 * Не усекает — усечение теперь не нужно благодаря чанкингу.
 * 
 * @param {string} content - Исходный текст
 * @returns {string} Текст с номерами строк
 */
function numberLines(content) {
  if (!content) return '';
  return content
    .split('\n')
    .map((line, i) => `${i + 1}: ${line}`)
    .join('\n');
}

/**
 * Обычный вызов Gemini API — для маленьких файлов (одним запросом).
 * Сохранён из v1 для обратной совместимости.
 * 
 * @param {Object} context - RAG-контекст (Knowledge Maps)
 * @param {Array<{path: string, content: string}>} codeFiles - Код студента
 * @param {string|null} screenshotBase64 - Скриншот
 * @param {Object} staticMetrics - Статические метрики от codeAnalyzer
 * @returns {Promise<Object>} JSON-ответ модели
 */
async function callGemini(context, codeFiles, screenshotBase64, staticMetrics = {}) {
  
  // Подготовка объекта Payload с четким разделением
  const htmlFiles = codeFiles.filter(f => f.path.endsWith('.html'));
  const cssFiles = codeFiles.filter(f => f.path.endsWith('.css'));

  const payload = {
    sourceCode: {
      html: htmlFiles.map(f => ({
        path: f.path,
        content: numberLines(f.content)
      })),
      css: cssFiles.map(f => ({
        path: f.path,
        content: numberLines(f.content)
      }))
    },
    staticMetrics: staticMetrics
  };

  const payloadString = JSON.stringify(payload, null, 2);

  const systemInstruction = buildSystemInstruction(context);

  const textPrompt = `Here is the Payload for the student's submission:\n\n${payloadString}\n\nPlease analyze this payload and return the evaluation JSON.`;

  // Настройка модели: Gemini 2.5 Flash
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemInstruction,
  });

  const contentParts = [{ text: textPrompt }];

  if (screenshotBase64) {
    contentParts.push({
      inlineData: {
        data: screenshotBase64,
        mimeType: "image/png"
      }
    });
  }

  console.log(`[Gemini] Обычный вызов (1 запрос)...`);
  return await executeGeminiCall(model, contentParts);
}

/**
 * Вспомогательная функция для выполнения вызова Gemini API с автоматическим повтором при ошибках 429/503.
 * Это защищает от превышения лимитов запросов (Rate Limit Exceeded) на бесплатном ключе.
 */
async function executeGeminiCallWithRetry(model, contentParts, chunkIndex = null, retries = 3, baseDelayMs = 4000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await executeGeminiCall(model, contentParts, chunkIndex);
    } catch (error) {
      const isRateLimit = error.message?.includes('429') || 
                          error.message?.includes('Quota') || 
                          error.message?.includes('quota') || 
                          error.message?.includes('limit');
      const isServiceUnavailable = error.message?.includes('503') || 
                                   error.message?.includes('demand') || 
                                   error.message?.includes('overloaded');
      
      const label = chunkIndex ? `Чанк ${chunkIndex}` : 'Основной';
      
      if ((isRateLimit || isServiceUnavailable) && attempt < retries) {
        // Вычисляем экспоненциальную задержку: 4с, 8с, 16с...
        const waitTime = baseDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[Gemini] ⚠️ ${label}: 429/503 қатесі (сұраныс лимиті). ${waitTime / 1000} секунд күтеміз (әрекет ${attempt}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Если это последняя попытка или другая ошибка, выбрасываем её
      throw error;
    }
  }
}

/**
 * Последовательный вызов Gemini API для чанков — с защитой от превышения лимитов.
 * Вместо отправки всех чанков одновременно (что мгновенно превышает Quota 5 RPM),
 * мы отправляем их друг за другом с небольшой задержкой (2 секунды).
 * 
 * @param {Object} context - RAG-контекст (Knowledge Maps)
 * @param {Array<Object>} chunks - Массив чанков из semanticChunker
 * @param {string|null} screenshotBase64 - Скриншот (только для первого чанка)
 * @param {Object} staticMetrics - Статические метрики
 * @returns {Promise<Array<Object>>} Массив JSON-ответов от успешных чанков
 */
async function callGeminiChunked(context, chunks, screenshotBase64, staticMetrics = {}) {
  console.log(`[Gemini] Кезекті түрде жіберу: ${chunks.length} чанк, лимит қорғанысымен...`);

  const systemInstruction = buildChunkedSystemInstruction(context, staticMetrics);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemInstruction,
  });

  const successfulResults = [];
  let failedCount = 0;

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    const isFirstChunk = idx === 0;

    const chunkPrompt = buildChunkPrompt(chunk, staticMetrics);
    const contentParts = [{ text: chunkPrompt }];

    // Скриншот отправляется только с первым чанком для экономии токенов
    if (isFirstChunk && screenshotBase64) {
      contentParts.push({
        inlineData: {
          data: screenshotBase64,
          mimeType: "image/png"
        }
      });
    }

    // Добавляем паузу между запросами (12 секунд), чтобы соответствовать лимитам API (5 RPM)
    if (idx > 0) {
      await new Promise(resolve => setTimeout(resolve, 12000));
    }

    try {
      const res = await executeGeminiCallWithRetry(model, contentParts, chunk.index, 3, 4000);
      res.chunkType = chunk.type; // Передаем тип чанка для правильной агрегации оценок
      console.log(`  ✅ Чанк ${chunk.index}/${chunk.totalChunks} [${chunk.type}] — OK`);
      successfulResults.push(res);
    } catch (err) {
      failedCount++;
      console.error(`  ❌ Чанк ${chunk.index}/${chunk.totalChunks} [${chunk.type}] — ҚАТЕ: ${err.message}`);
    }
  }

  console.log(`[Gemini] Аяқталды: ${successfulResults.length} сәтті, ${failedCount} қате (барлығы: ${chunks.length})`);

  // Если все чанки провалились — выбрасываем ошибку
  if (successfulResults.length === 0) {
    throw new Error('Барлық чанктер Gemini API-ден қате қайтарды. Қайта байқап көріңіз.');
  }

  return successfulResults;
}

/**
 * Выполняет один вызов Gemini API с таймаутом.
 * Общая функция для обычного и чанкового режима.
 * 
 * @param {Object} model - Экземпляр Gemini модели
 * @param {Array} contentParts - Части контента (текст + картинка)
 * @param {number|null} chunkIndex - Номер чанка (для логов)
 * @returns {Promise<Object>} Распарсенный JSON-ответ
 */
async function executeGeminiCall(model, contentParts, chunkIndex = null) {
  const label = chunkIndex ? `Чанк ${chunkIndex}` : 'Основной';

  // --- AbortController для таймаута ---
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: contentParts }],
      generationConfig: {
        temperature: 0.1, // Максимальная детерминированность
        responseMimeType: "application/json",
      }
    }, { signal: controller.signal });

    clearTimeout(timeoutId);

    const responseText = result.response.text();
    // Очищаем от возможных markdown-обёрток
    const cleanJson = responseText.replace(/```json\s?|```/g, '').trim();

    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error(`[Gemini] ${label}: Ошибка парсинга JSON`, parseError.message);
      console.error(`[Gemini] ${label}: Начало ответа:`, cleanJson.substring(0, 200));
      throw new Error(`JSON парсинг қатесі (${label})`);
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Уақыт шектеуі аяқталды — ${GEMINI_TIMEOUT_MS / 1000}с (${label})`);
    }
    throw error;
  }
}

/**
 * Формирует системный промпт для обычного (нечанкового) вызова.
 * Включает RAG-контекст и правила вывода.
 * 
 * @param {Object} context - RAG-контекст
 * @returns {string} Системный промпт
 */
function buildSystemInstruction(context) {
  return `${EXPERT_SYSTEM_PROMPT}

===========================================================
RAG CONTEXT (Динамикалық білім базасы):
===========================================================
${JSON.stringify(context, null, 2)}

===========================================================
QUERY PROTOCOL:
===========================================================
- Payload-тағы "sourceCode" — жалғыз ақиқат көзі. Одан тыс код ОЙЛАП ЖАЗБАҢЫЗ.
- Жол нөмірлеріне назар аударыңыз.
- staticMetrics деректерін міндетті тексеріңіз.
- JSON-нан тыс ЕШТЕҢЕ жазбаңыз.`;
}

/**
 * Формирует системный промпт для чанкового вызова.
 * Отличается от обычного:
 *   - Объясняет модели, что она получает ЧАСТЬ проекта
 *   - Просит оценивать только свой чанк, а не весь проект
 *   - Включает staticMetrics для контекста
 * 
 * @param {Object} context - RAG-контекст
 * @param {Object} staticMetrics - Статические метрики всего проекта
 * @returns {string} Системный промпт
 */
function buildChunkedSystemInstruction(context, staticMetrics) {
  return `You are a Senior Fullstack Developer and an expert AI Code Reviewer.
You are analyzing ONE CHUNK of a student's HTML/CSS project. The project has been split into semantic chunks (header, main, sections, footer, CSS).

CRITICAL RULES:
1. You receive ONE chunk at a time. Analyze ONLY the code in this chunk.
2. Do NOT assume or invent code that is NOT present in this chunk.
3. ALL text fields (summary, detail, issue, howToFix) MUST be STRICTLY IN KAZAKH LANGUAGE. Keys remain in English.
4. Return STRICTLY valid JSON matching the schema below.

===========================================================
KNOWLEDGE MAPS (RAG CONTEXT):
===========================================================
${JSON.stringify(context, null, 2)}

===========================================================
STATIC METRICS (WHOLE PROJECT — for reference only):
===========================================================
${JSON.stringify(staticMetrics, null, 2)}

===========================================================
REQUIRED JSON SCHEMA (for each chunk):
===========================================================
{
  "scores": { "html": 0-30, "css": 0-30, "ui": 0-40, "total": 0-100 },
  "feedback": [
    {
      "category": "HTML" | "CSS" | "UI",
      "location": "file:line or section name",
      "issue": "описание проблемы на казахском",
      "howToFix": "решение на казахском",
      "studyMaterials": ["ссылка или источник"]
    }
  ],
  "scoreJustifications": {
    "html": { "summary": "...", "maxScore": 30, "earnedScore": N, "deductionReasons": [...] },
    "css": { "summary": "...", "maxScore": 30, "earnedScore": N, "deductionReasons": [...] },
    "ui": { "summary": "...", "maxScore": 40, "earnedScore": N, "assessmentBreakdown": [...] }
  },
  "learningPathRecommendations": [...],
  "nextAttemptSuggestion": { "focus": "...", "expectedImprovementPoints": N, "changes": [...] }
}`;
}

/**
 * Формирует промпт для конкретного чанка.
 * Включает метаданные чанка (тип, индекс) и сам код.
 * 
 * @param {Object} chunk - Объект чанка из semanticChunker
 * @param {Object} staticMetrics - Статические метрики
 * @returns {string} Промпт для отправки
 */
function buildChunkPrompt(chunk, staticMetrics) {
  return `=== CHUNK ${chunk.index} of ${chunk.totalChunks} ===
Type: ${chunk.type}
File: ${chunk.fileName}

--- CODE START ---
${numberLines(chunk.content)}
--- CODE END ---

Analyze this chunk and return the evaluation JSON. Focus ONLY on the code above.
Remember: All user-facing text MUST be in KAZAKH LANGUAGE.`;
}

export { callGemini, callGeminiChunked };
