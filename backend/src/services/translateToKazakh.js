/**
 * Сервис перевода JSON-отчёта на академический казахский язык.
 * Использует второй вызов Groq — отдельный от code review.
 * 
 * Зачем отдельный вызов? Llama 4 даёт максимальное качество кода на английском,
 * а перевод лучше делать отдельно, чтобы не мешать анализу.
 * 
 * Переводятся только текстовые поля (summary, detail, issue, howToFix, etc.).
 * Технические поля (rule, line, codeSnippet, maxPoints и т.д.) не трогаются.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Список полей, которые нужно переводить.
 * Все остальные поля остаются нетронутыми.
 */
const TRANSLATABLE_FIELDS = new Set([
  'summary', 'scoringRationale', 'detail', 'issue', 'howToFix',
  'topic', 'reason', 'practiceTask', 'focus',
  'ruleName', 'criterion', 'grade',
]);

/**
 * Рекурсивно собирает все строки для перевода из объекта.
 * Возвращает {key: englishText} словарь.
 */
function collectTexts(obj, path = '', result = {}) {
  if (!obj || typeof obj !== 'object') return result;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => collectTexts(item, `${path}[${i}]`, result));
    return result;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string' && TRANSLATABLE_FIELDS.has(key) && value.trim()) {
      result[fullPath] = value;
    } else if (Array.isArray(value)) {
      // Массив строк (например changes, studyMaterials)
      if (key === 'changes' || key === 'studyMaterials') {
        value.forEach((item, i) => {
          if (typeof item === 'string') result[`${fullPath}[${i}]`] = item;
        });
      } else {
        value.forEach((item, i) => collectTexts(item, `${fullPath}[${i}]`, result));
      }
    } else if (typeof value === 'object') {
      collectTexts(value, fullPath, result);
    }
  }
  return result;
}

/**
 * Рекурсивно применяет переводы обратно к объекту.
 */
function applyTranslations(obj, translations, path = '') {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item, i) => applyTranslations(item, translations, `${path}[${i}]`));
  }

  const result = { ...obj };
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (typeof value === 'string' && TRANSLATABLE_FIELDS.has(key)) {
      result[key] = translations[fullPath] || value;
    } else if (Array.isArray(value)) {
      if (key === 'changes' || key === 'studyMaterials') {
        result[key] = value.map((item, i) =>
          typeof item === 'string' ? (translations[`${fullPath}[${i}]`] || item) : item
        );
      } else {
        result[key] = value.map((item, i) =>
          applyTranslations(item, translations, `${fullPath}[${i}]`)
        );
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = applyTranslations(value, translations, fullPath);
    }
  }
  return result;
}

/**
 * Переводит все текстовые поля JSON-отчёта на академический казахский.
 * @param {Object} reviewJson - Полный JSON с code review на английском
 * @returns {Promise<Object>} Тот же объект, но со всеми текстами на казахском
 */
async function translateToKazakh(reviewJson) {
  // Собираем тексты для перевода
  const textsToTranslate = collectTexts(reviewJson);
  const textCount = Object.keys(textsToTranslate).length;

  if (textCount === 0) return reviewJson;

  console.log(`[Translate] Перевод ${textCount} текстовых полей на академический казахский...`);

  const translationPrompt = `You are a professional Kazakh linguist and translator specializing in academic and technical texts.
Your task: translate all English text values in the JSON below into natural, academically correct KAZAKH language (Казақ тілі).

Translation requirements:
- Use literary, academic Kazakh (академиялық қазақ тілі), NOT machine-translation Kazakh
- Preserve all technical terms, code snippets, and file references AS IS (e.g. "index.html", "CSS", "BEM", "Flexbox" stay unchanged)
- Use proper Kazakh grammatical cases, particles, and verb forms
- Code examples inside backticks stay in English
- Be concise and natural — avoid word-for-word translation

Input (key → English text to translate):
${JSON.stringify(textsToTranslate, null, 2)}

Return ONLY a valid JSON object with the SAME keys but Kazakh translations as values.
Example format: {"summary": "Kazakh text here", "detail": "Kazakh text here"}`;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: 'You are a professional Kazakh linguist. Translate accurately and naturally. Return ONLY valid JSON.',
    });

    console.log('[Translate] Отправка текста на перевод в Gemini...');
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: translationPrompt }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      }
    });

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json\s?|```/g, '').trim();
    const translations = JSON.parse(cleanJson);
    console.log(`[Translate] Переведено ${Object.keys(translations).length} полей.`);

    // Применяем переводы обратно к объекту
    return applyTranslations(reviewJson, translations);
  } catch (error) {
    console.error('[Translate] Ошибка перевода:', error.message);
    // В случае ошибки перевода возвращаем оригинал, чтобы не ломать весь пайплайн
    return reviewJson;
  }
}

export { translateToKazakh };
