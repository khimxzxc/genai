import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Fuse from 'fuse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data');

const loadJson = (filename) => {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'));
};

const htmlRules = loadJson('html_rules.json');
const cssRules = loadJson('css_rules.json');
const uiCriteria = loadJson('ui_criteria.json');
const examples = loadJson('few_shot_examples.json');
const scoringSystem = loadJson('scoring_system.json');

/**
 * Ключевые слова, связанные с HTML/CSS вёрсткой.
 * Используются для более точного поиска релевантных правил.
 */
const HTML_KEYWORDS = [
  'header', 'footer', 'main', 'nav', 'section', 'article', 'aside',
  'h1', 'h2', 'h3', 'title', 'meta', 'doctype', 'alt', 'aria',
  'label', 'input', 'form', 'img', 'a', 'button', 'div', 'span',
  'semantic', 'structure', 'hierarchy', 'accessibility', 'wcag',
];

const CSS_KEYWORDS = [
  'flexbox', 'flex', 'grid', 'media', 'responsive', 'bem', 'class',
  'variable', 'root', 'padding', 'margin', 'color', 'font', 'rem',
  'px', 'hover', 'transition', 'animation', 'border', 'box-sizing',
  'important', 'float', 'position', 'display', 'width', 'height',
];

/**
 * Извлекает ключевые слова из кода студента, релевантные для HTML/CSS поиска.
 * Фильтрует только слова из наших ключевых словарей, чтобы поиск был точнее.
 */
function extractRelevantKeywords(fullText) {
  const words = new Set(fullText.toLowerCase().split(/[\W\s]+/).filter(w => w.length > 2));
  const htmlMatches = HTML_KEYWORDS.filter(kw => words.has(kw) || fullText.includes(kw));
  const cssMatches = CSS_KEYWORDS.filter(kw => words.has(kw) || fullText.includes(kw));
  return {
    htmlQuery: htmlMatches.join(' ') || 'semantic html structure',
    cssQuery: cssMatches.join(' ') || 'css flexbox layout',
  };
}

/**
 * Оценивает примерный размер объекта в символах (≈ токенах / 4).
 */
function estimateTokens(obj) {
  return Math.ceil(JSON.stringify(obj).length / 4);
}

/**
 * Ищет релевантные правила и контекст для RAG.
 * Контекст ограничен ~3500 токенами, чтобы не перегружать промпт.
 *
 * @param {Array<{path: string, content: string}>} codeFiles
 * @returns {Object} Контекст с правилами и примерами
 */
function retrieveRelevantContext(codeFiles) {
  let fullText = '';
  codeFiles.forEach(file => {
    fullText += file.content + ' ';
  });

  // Точный поиск по словам из кода студента
  const { htmlQuery, cssQuery } = extractRelevantKeywords(fullText);

  const htmlFuse = new Fuse(htmlRules, {
    keys: ['rule', 'keyword', 'id', 'description'],
    threshold: 0.35,  // Строже, чем раньше (0.4) — меньше ложных совпадений
  });

  const cssFuse = new Fuse(cssRules, {
    keys: ['rule', 'keyword', 'id', 'description'],
    threshold: 0.35,
  });

  // Базовые ключевые правила — всегда включаются
  const essentialHtml = htmlRules.filter(r => ['H1', 'H2', 'H3', 'H4'].includes(r.id));
  const essentialCss = cssRules.filter(r => ['R1', 'R2', 'R3', 'R4'].includes(r.id));

  // Дополнительно ищем через Fuse
  const extraHtml = htmlFuse.search(htmlQuery).map(res => res.item);
  const extraCss = cssFuse.search(cssQuery).map(res => res.item);

  // Объединяем, убираем дубликаты, ограничиваем 6 правилами каждого типа
  const combinedHtml = [...new Map([...essentialHtml, ...extraHtml].map(r => [r.id, r])).values()].slice(0, 6);
  const combinedCss  = [...new Map([...essentialCss, ...extraCss].map(r => [r.id, r])).values()].slice(0, 6);

  // Бюджет токенов для RAG-контекста: 3500 токенов
  const TOKEN_BUDGET = 3500;
  let usedTokens = estimateTokens({ htmlRules: combinedHtml, cssRules: combinedCss, uiCriteria });

  // Добавляем примеры (BAD + MEDIUM + GOOD) пока не превышен бюджет
  const selectedExamples = [];
  for (const ex of examples) {
    const exTokens = estimateTokens(ex);
    if (usedTokens + exTokens > TOKEN_BUDGET) break;
    selectedExamples.push(ex);
    usedTokens += exTokens;
  }

  console.log(`[Retriever] Контекст: ${combinedHtml.length} HTML правил, ${combinedCss.length} CSS правил, ${selectedExamples.length} примеров. ~${usedTokens} токенов.`);

  return {
    htmlRules: combinedHtml,
    cssRules: combinedCss,
    uiCriteria,
    scoringSystem,
    examples: selectedExamples,
  };
}

export { retrieveRelevantContext };
