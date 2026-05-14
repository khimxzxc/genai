/**
 * Gemini API сервис (заменяет groqService.js).
 * Реализует Context Chunking, Payload структуру и температуру 0.1 для максимальной детерминированности.
 * Использует Gemini 2.5 Flash для оценки (LLM-as-a-judge).
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Умный парсинг и усечение файла (Context Chunking)
 * Предотвращает галлюцинации LLM на больших файлах
 */
function chunkContent(content, maxLines = 500) {
  if (!content) return '';
  const lines = content.split('\n');
  if (lines.length <= maxLines) {
    return lines.map((l, i) => `${i + 1}: ${l}`).join('\n');
  }
  const chunked = lines.slice(0, maxLines).map((l, i) => `${i + 1}: ${l}`).join('\n');
  return `${chunked}\n\n...[ФАЙЛ УСЕЧЕН ПОСЛЕ ${maxLines} СТРОК ДЛЯ ПРЕДОТВРАЩЕНИЯ ГАЛЛЮЦИНАЦИЙ]...`;
}

/**
 * Вызывает Gemini API.
 * @param {Object} context - RAG-контекст (Knowledge Maps)
 * @param {Array<{path: string, content: string}>} codeFiles - Код студента
 * @param {string|null} screenshotBase64 - Скриншот
 * @param {Object} staticMetrics - Статические метрики
 * @returns {Promise<Object>}
 */
async function callGemini(context, codeFiles, screenshotBase64, staticMetrics = {}) {
  
  // 1. Подготовка объекта Payload с четким разделением
  const htmlFiles = codeFiles.filter(f => f.path.endsWith('.html'));
  const cssFiles = codeFiles.filter(f => f.path.endsWith('.css'));

  const payload = {
    sourceCode: {
      html: htmlFiles.map(f => ({
        path: f.path,
        content: chunkContent(f.content)
      })),
      css: cssFiles.map(f => ({
        path: f.path,
        content: chunkContent(f.content)
      }))
    },
    staticMetrics: staticMetrics
  };

  const payloadString = JSON.stringify(payload, null, 2);

  const systemInstruction = `You are a Senior Fullstack Developer and an expert AI Code Reviewer.
Your task is to analyze the student's project using the provided Payload and return structured JSON feedback.

===========================================================
KNOWLEDGE MAPS (RAG CONTEXT):
===========================================================
${JSON.stringify(context, null, 2)}

===========================================================
PAYLOAD ANALYSIS PROTOCOL:
===========================================================
- Treat the "sourceCode" in the payload as the ground truth.
- Pay attention to line numbers provided in the chunks.
- If a file was truncated, analyze the available chunk.
- DO NOT invent code that is not in the Payload.
- Use "staticMetrics" to verify your observations (e.g., if staticMetrics says 0 flexbox, do not assume flexbox is present).

===========================================================
OUTPUT REQUIREMENTS:
===========================================================
1. Return STRICTLY valid JSON.
2. ALL text fields intended for the user (summary, detail, issue, howToFix, etc.) MUST be generated STRICTLY IN KAZAKH LANGUAGE.
3. Keys of the JSON must remain in English.
4. Follow the CoT reasoning before generating the final JSON.`;

  const textPrompt = `Here is the Payload for the student's submission:

${payloadString}

Please analyze this payload and return the evaluation JSON.`;

  // Настройка модели: Gemini 2.5 Flash (как запрошено, вместо Llama 4)
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

  console.log(`[Gemini] Отправка запроса в Gemini 2.5 Flash...`);
  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: contentParts }],
      generationConfig: {
        temperature: 0.1, // Настроено на 0.1 для максимальной детерминированности
        responseMimeType: "application/json",
      }
    });

    console.log('[Gemini] Ответ получен успешно.');
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json\s?|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('[Gemini] Ошибка генерации или парсинга:', error.message);
    throw new Error('Модель қайтарған деректер форматы қате (Gemini 2.5 Flash)');
  }
}

export { callGemini };
