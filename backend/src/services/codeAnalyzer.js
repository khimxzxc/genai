/**
 * Статический анализатор HTML/CSS кода студента.
 * Извлекает конкретные метрики из кода, которые передаются в LLM как факты.
 * Это помогает избежать "галлюцинаций" и сделать оценки дифференцированными.
 */

/**
 * Анализирует HTML-код и возвращает конкретные метрики.
 * @param {string} html
 * @returns {Object} Метрики HTML
 */
function analyzeHTML(html) {
  if (!html) return {};

  const lines = html.split('\n');

  // Семантические теги
  const semanticTags = ['header', 'nav', 'main', 'footer', 'section', 'article', 'aside', 'figure', 'figcaption', 'address', 'time', 'mark', 'summary', 'details'];
  const foundSemantic = [];
  semanticTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[\\s>]`, 'gi');
    if (regex.test(html)) foundSemantic.push(tag);
  });

  // Считаем div-ы
  const divCount = (html.match(/<div[\s>]/gi) || []).length;

  // DOCTYPE
  const hasDoctype = /<!DOCTYPE\s+html>/i.test(html);

  // lang атрибут
  const langMatch = html.match(/<html[^>]*lang=["']([^"']*)["']/i);
  const langAttr = langMatch ? langMatch[1] : null;

  // meta charset
  const hasCharset = /meta[^>]*charset/i.test(html);

  // meta viewport
  const hasViewport = /meta[^>]*viewport/i.test(html);

  // title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].trim() : null;

  // h1-h6 иерархия
  const headings = [];
  for (let level = 1; level <= 6; level++) {
    const matches = html.match(new RegExp(`<h${level}[\\s>]`, 'gi')) || [];
    if (matches.length > 0) headings.push({ level, count: matches.length });
  }
  const h1Count = headings.find(h => h.level === 1)?.count || 0;

  // img без alt
  const allImgs = (html.match(/<img[^>]*/gi) || []);
  const imgsWithoutAlt = allImgs.filter(img => !/alt=["'][^"']+["']/i.test(img));

  // Inline стили
  const inlineStyles = (html.match(/style=["'][^"']+["']/gi) || []).length;

  // input без label
  const inputCount = (html.match(/<input[^>]*/gi) || []).length;
  const labelCount = (html.match(/<label[^>]*/gi) || []).length;

  // Устаревшие теги
  const deprecatedTags = ['<font', '<center', '<marquee', '<blink', '<frameset', '<frame'];
  const foundDeprecated = deprecatedTags.filter(t => html.toLowerCase().includes(t.toLowerCase()));

  // aria атрибуты
  const ariaCount = (html.match(/aria-[a-z]+=["'][^"']+["']/gi) || []).length;

  // Строки с конкретными нарушениями
  const violations = [];
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (!hasDoctype && idx === 0 && !trimmed.startsWith('<!DOCTYPE')) {
      violations.push({ line: lineNum, issue: 'DOCTYPE жоқ', code: trimmed });
    }
    if (/style=["'][^"']+["']/i.test(trimmed)) {
      violations.push({ line: lineNum, issue: 'Inline style', code: trimmed.substring(0, 80) });
    }
    if (/<img[^>]*(?!alt=)[^>]*>/i.test(trimmed) && !/alt=/i.test(trimmed)) {
      violations.push({ line: lineNum, issue: 'img alt жоқ', code: trimmed.substring(0, 80) });
    }
  });

  return {
    hasDoctype,
    langAttr,
    hasCharset,
    hasViewport,
    titleText,
    semanticTagsFound: foundSemantic,
    semanticTagsCount: foundSemantic.length,
    divCount,
    divToSemanticRatio: foundSemantic.length > 0 ? (divCount / foundSemantic.length).toFixed(1) : 'inf (div ғана қолданылған)',
    headings,
    h1Count,
    imgsWithoutAlt: imgsWithoutAlt.length,
    totalImgs: allImgs.length,
    inlineStylesCount: inlineStyles,
    inputCount,
    labelCount,
    foundDeprecatedTags: foundDeprecated,
    ariaAttributesCount: ariaCount,
    topViolations: violations.slice(0, 10),
  };
}

/**
 * Анализирует CSS-код и возвращает конкретные метрики.
 * @param {string} css
 * @returns {Object} Метрики CSS
 */
function analyzeCSS(css) {
  if (!css) return { isEmpty: true };

  const lines = css.split('\n');

  // Flexbox / Grid
  const hasFlexbox = /display\s*:\s*flex/i.test(css);
  const hasGrid = /display\s*:\s*grid/i.test(css);
  const hasFloat = /float\s*:\s*(left|right)/i.test(css);
  const floatCount = (css.match(/float\s*:\s*(left|right)/gi) || []).length;

  // !important
  const importantCount = (css.match(/!important/gi) || []).length;

  // CSS переменные
  const cssVarsCount = (css.match(/--[a-z-]+\s*:/gi) || []).length;
  const hasRoot = /:root\s*\{/i.test(css);

  // Медиа-запросы
  const mediaQueries = css.match(/@media[^{]+\{/gi) || [];
  const breakpoints = mediaQueries.map(mq => {
    const match = mq.match(/\d+px/g);
    return match ? match.join(', ') : mq.trim().substring(0, 40);
  });

  // BEM-классы
  const bemClasses = (css.match(/\.[a-z][a-z0-9-]*__[a-z][a-z0-9-]*/gi) || []);
  const nonBemClasses = (css.match(/\.[a-z][a-z0-9-]*(?!__)[^{]*/gi) || [])
    .map(c => c.trim().substring(0, 30))
    .filter(c => !c.includes('__') && !c.includes(':') && !c.startsWith('.') === false)
    .slice(0, 5);

  // Дубликаты селекторов
  const selectors = (css.match(/\.[a-z][^{]+\{/gi) || []).map(s => s.replace('{', '').trim());
  const selectorCounts = {};
  selectors.forEach(s => { selectorCounts[s] = (selectorCounts[s] || 0) + 1; });
  const duplicateSelectors = Object.entries(selectorCounts).filter(([, c]) => c > 1).map(([s]) => s);

  // box-sizing
  const hasBoxSizing = /box-sizing\s*:\s*border-box/i.test(css);

  // rem / em vs px для шрифтов
  const fontSizePx = (css.match(/font-size\s*:\s*\d+px/gi) || []).length;
  const fontSizeRem = (css.match(/font-size\s*:\s*[\d.]+r?em/gi) || []).length;

  // Фиксированные px ширины контейнеров
  const fixedWidths = (css.match(/width\s*:\s*\d{3,4}px/gi) || []).slice(0, 5);

  // Строки с нарушениями
  const violations = [];
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (/float\s*:\s*(left|right)/i.test(trimmed)) {
      violations.push({ line: lineNum, issue: 'float қолданылған', code: trimmed });
    }
    if (/!important/i.test(trimmed)) {
      violations.push({ line: lineNum, issue: '!important', code: trimmed });
    }
    if (/font-size\s*:\s*\d+px/i.test(trimmed)) {
      violations.push({ line: lineNum, issue: 'font-size px-пен', code: trimmed });
    }
  });

  return {
    isEmpty: false,
    hasFlexbox,
    hasGrid,
    hasFloat,
    floatCount,
    importantCount,
    cssVarsCount,
    hasRoot,
    mediaQueriesCount: mediaQueries.length,
    breakpoints,
    bemClassesCount: bemClasses.length,
    bemClasses: bemClasses.slice(0, 5),
    nonBemExamples: nonBemClasses,
    duplicateSelectors: duplicateSelectors.slice(0, 5),
    duplicateSelectorsCount: duplicateSelectors.length,
    hasBoxSizing,
    fontSizePx,
    fontSizeRem,
    fixedWidths,
    topViolations: violations.slice(0, 10),
  };
}

/**
 * Основная функция — анализирует все файлы проекта.
 * @param {Array<{path: string, content: string}>} codeFiles
 * @returns {Object} Полный отчёт со статическими метриками
 */
function analyzeProject(codeFiles) {
  let htmlCode = '';
  let cssCode = '';
  const htmlFile = codeFiles.find(f => f.path.endsWith('.html') || f.path === 'index.html');
  const cssFiles = codeFiles.filter(f => f.path.endsWith('.css'));

  if (htmlFile) htmlCode = htmlFile.content;
  cssFiles.forEach(f => { cssCode += f.content + '\n'; });

  return {
    htmlMetrics: analyzeHTML(htmlCode),
    cssMetrics: analyzeCSS(cssCode),
  };
}

export { analyzeProject };
