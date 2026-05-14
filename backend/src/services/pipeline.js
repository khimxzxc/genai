import { retrieveRelevantContext } from './retriever.js';
import { callGemini } from './geminiService.js';
import { classifyQuality } from './decisionTree.js';
import { analyzeProject } from './codeAnalyzer.js';
import { translateToKazakh } from './translateToKazakh.js';

/**
 * Главный пайплайн — двухпроходная система оценки:
 *
 * Проход 1 (Code Review):
 *   codeAnalyzer → retriever → geminiService
 *   Gemini генерирует ПОЛНЫЙ code review на английском:
 *   детальный анализ по строкам, конкретные примеры кода, PR-стиль комментарии.
 *
 * Проход 2 (Translation):
 *   translateToKazakh → переводит все текстовые поля на академический казахский
 *   при этом сохраняя технические поля (line, rule, codeSnippet) нетронутыми.
 *
 * Проход 3 (Decision Tree):
 *   classifyQuality → детерминированно подтверждает grade на основе scores.
 *
 * @param {Array<{path: string, content: string}>} codeFiles
 * @param {string|null} screenshotBase64
 * @returns {Promise<Object>}
 */
async function evaluateCode(codeFiles, screenshotBase64) {
  // 1. Статический анализ — извлекаем реальные метрики из кода студента
  const staticMetrics = analyzeProject(codeFiles);
  console.log('[Pipeline] Шаг 1: Статический анализ завершён.', {
    semanticTags: staticMetrics.htmlMetrics?.semanticTagsCount,
    mediaQueries: staticMetrics.cssMetrics?.mediaQueriesCount,
    cssVars: staticMetrics.cssMetrics?.cssVarsCount,
    bemClasses: staticMetrics.cssMetrics?.bemClassesCount,
  });

  // 2. RAG — получаем релевантный контекст из базы знаний
  const context = retrieveRelevantContext(codeFiles);

  // 3. Проход 1: LLM code review (сразу на казахском)
  console.log('[Pipeline] Шаг 2: ИИ анализ кода (Gemini)...');
  const reviewData = await callGemini(context, codeFiles, screenshotBase64, staticMetrics);

  if (!reviewData.scores) {
    reviewData.scores = { html: 0, css: 0, ui: 0, total: 0 };
  }

  // 4. Санитизация категорий feedback → строго HTML | CSS | UI для Prisma Enum
  if (Array.isArray(reviewData.feedback)) {
    reviewData.feedback = reviewData.feedback.map(item => {
      const catLower = (item.category || 'ui').toLowerCase();
      let category = 'UI';
      if (catLower.includes('html')) category = 'HTML';
      else if (catLower.includes('css')) category = 'CSS';
      return { ...item, category };
    });
  }

  // 5. Decision Tree: детерминированно подтверждает grade
  const final = classifyQuality(reviewData.scores);

  return {
    ...reviewData,
    grade: final.grade || reviewData.grade,
    gradeReason: final.reason,
    isStable: true,
  };
}

export { evaluateCode };
