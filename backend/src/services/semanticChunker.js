/**
 * ============================================================
 * Семантический чанкер HTML/CSS кода (Semantic Chunker)
 * ============================================================
 * 
 * Назначение: Разбивает HTML-файлы студента на логические блоки
 * (header, nav, main, section, footer, aside) через cheerio.
 * Это позволяет отправлять каждый блок в Gemini API отдельно,
 * избегая лимита контекста и таймаутов.
 * 
 * Fallback-стратегия: Если в HTML нет семантических тегов (div-soup),
 * разбиваем по верхнеуровневым <div> в <body>.
 * 
 * CSS-файлы объединяются в отдельный чанк.
 * ============================================================
 */

import * as cheerio from 'cheerio';

/**
 * Семантические теги верхнего уровня, по которым разбиваем HTML.
 * Порядок важен — от начала документа к концу.
 */
const SEMANTIC_TAGS = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];

/**
 * Минимальная длина контента чанка (в символах), чтобы не отправлять пустышки.
 * Чанки меньше этого лимита объединяются с соседними.
 */
const MIN_CHUNK_LENGTH = 50;

/**
 * Порог общего количества строк, выше которого активируется чанкинг.
 * Для маленьких файлов чанкинг не нужен — лишний overhead.
 */
const CHUNKING_THRESHOLD_LINES = 600;

/**
 * Разбивает один HTML-файл на семантические чанки через cheerio.
 * 
 * Алгоритм:
 * 1. Загружаем HTML в cheerio
 * 2. Извлекаем <head> как отдельный чанк (мета-данные)
 * 3. Ищем семантические теги (header, main, section и т.д.)
 * 4. Если семантических тегов нет — fallback на верхнеуровневые <div>
 * 5. Маленькие чанки (< MIN_CHUNK_LENGTH) объединяем с соседними
 * 
 * @param {string} html - Содержимое HTML-файла
 * @param {string} fileName - Имя файла (например 'index.html')
 * @returns {Array<{type: string, content: string, fileName: string}>}
 */
function parseHtmlToChunks(html, fileName) {
  if (!html || !html.trim()) return [];

  const $ = cheerio.load(html, { decodeEntities: false });
  const chunks = [];

  // --- 1. Извлекаем <head> как отдельный чанк ---
  const headContent = $('head').html();
  if (headContent && headContent.trim().length > MIN_CHUNK_LENGTH) {
    chunks.push({
      type: 'head',
      content: `<head>\n${headContent.trim()}\n</head>`,
      fileName,
    });
  }

  // --- 2. Ищем семантические теги в <body> ---
  const body = $('body');
  const semanticChunks = [];

  SEMANTIC_TAGS.forEach(tag => {
    body.find(tag).each((index, element) => {
      const outerHtml = $.html(element);
      if (outerHtml && outerHtml.trim().length >= MIN_CHUNK_LENGTH) {
        semanticChunks.push({
          type: tag,
          content: outerHtml.trim(),
          fileName,
        });
      }
    });
  });

  // --- 3. Fallback: если семантических тегов мало, режем по <div> ---
  if (semanticChunks.length < 2) {
    const divChunks = [];
    // Берём только прямых потомков body (верхнеуровневые div)
    body.children('div').each((index, element) => {
      const outerHtml = $.html(element);
      if (outerHtml && outerHtml.trim().length >= MIN_CHUNK_LENGTH) {
        divChunks.push({
          type: `div-block-${index + 1}`,
          content: outerHtml.trim(),
          fileName,
        });
      }
    });

    // Если и div-ов мало — отдаём весь body как один чанк
    if (divChunks.length < 2) {
      const bodyHtml = body.html();
      if (bodyHtml && bodyHtml.trim()) {
        chunks.push({
          type: 'body-full',
          content: bodyHtml.trim(),
          fileName,
        });
      }
      return chunks;
    }

    chunks.push(...divChunks);
    return chunks;
  }

  chunks.push(...semanticChunks);
  return chunks;
}

/**
 * Объединяет слишком маленькие чанки с соседними.
 * Предотвращает отправку крошечных блоков (пустой footer и т.п.)
 * в Gemini API — это пустая трата токенов.
 * 
 * @param {Array} chunks - Массив чанков
 * @param {number} minLength - Минимальная длина в символах
 * @returns {Array} Объединённые чанки
 */
function mergeSmallChunks(chunks, minLength = 200) {
  if (chunks.length <= 1) return chunks;

  const merged = [];
  let buffer = null;

  for (const chunk of chunks) {
    if (buffer) {
      // Объединяем buffer с текущим чанком
      buffer = {
        type: `${buffer.type}+${chunk.type}`,
        content: `${buffer.content}\n\n${chunk.content}`,
        fileName: buffer.fileName,
      };
      // Если объединённый чанк уже достаточно большой — фиксируем
      if (buffer.content.length >= minLength) {
        merged.push(buffer);
        buffer = null;
      }
    } else if (chunk.content.length < minLength) {
      // Чанк слишком маленький — буферизуем
      buffer = { ...chunk };
    } else {
      merged.push(chunk);
    }
  }

  // Если остался буфер — добавляем к последнему или как отдельный
  if (buffer) {
    if (merged.length > 0) {
      const last = merged[merged.length - 1];
      last.content = `${last.content}\n\n${buffer.content}`;
      last.type = `${last.type}+${buffer.type}`;
    } else {
      merged.push(buffer);
    }
  }

  return merged;
}

/**
 * Главная функция чанкинга — точка входа.
 * Принимает массив файлов студента и возвращает массив чанков,
 * готовых для параллельной отправки в Gemini API.
 * 
 * Логика:
 * 1. Проверяем, нужен ли чанкинг (по кол-ву строк и файлов)
 * 2. Парсим каждый HTML через cheerio → семантические блоки
 * 3. Объединяем все CSS в один чанк
 * 4. Мерджим слишком маленькие чанки
 * 5. Добавляем метаданные (index, totalChunks)
 * 
 * @param {Array<{path: string, content: string}>} codeFiles - Файлы студента
 * @returns {{ needsChunking: boolean, chunks: Array<Object> }}
 */
function chunkCodeFiles(codeFiles) {
  const htmlFiles = codeFiles.filter(f => f.path.endsWith('.html'));
  const cssFiles = codeFiles.filter(f => f.path.endsWith('.css'));

  // --- Подсчитываем общее количество строк ---
  const totalLines = codeFiles.reduce((sum, f) => sum + (f.content?.split('\n').length || 0), 0);

  // --- Решаем, нужен ли чанкинг ---
  // Чанкинг активируется если: много строк ИЛИ несколько HTML файлов
  if (totalLines <= CHUNKING_THRESHOLD_LINES && htmlFiles.length <= 1) {
    return { needsChunking: false, chunks: [] };
  }

  console.log(`[SemanticChunker] Активирован: ${totalLines} строк, ${htmlFiles.length} HTML, ${cssFiles.length} CSS файлов`);

  // --- Парсим каждый HTML файл ---
  let allChunks = [];
  for (const file of htmlFiles) {
    const fileChunks = parseHtmlToChunks(file.content, file.path);
    allChunks.push(...fileChunks);
  }

  // --- CSS → отдельный чанк ---
  if (cssFiles.length > 0) {
    const combinedCss = cssFiles
      .map(f => `/* === ${f.path} === */\n${f.content}`)
      .join('\n\n');

    allChunks.push({
      type: 'css',
      content: combinedCss,
      fileName: cssFiles.map(f => f.path).join(', '),
    });
  }

  // --- Мерджим маленькие чанки ---
  allChunks = mergeSmallChunks(allChunks, 4000);

  // --- Добавляем метаданные (индексы) для промпта ---
  const totalChunks = allChunks.length;
  const enrichedChunks = allChunks.map((chunk, index) => ({
    ...chunk,
    index: index + 1,
    totalChunks,
  }));

  console.log(`[SemanticChunker] Результат: ${totalChunks} чанков`);
  enrichedChunks.forEach(ch => {
    console.log(`  → Чанк ${ch.index}/${ch.totalChunks}: [${ch.type}] из ${ch.fileName} (${ch.content.length} символов)`);
  });

  return { needsChunking: true, chunks: enrichedChunks };
}

export { chunkCodeFiles, parseHtmlToChunks };
