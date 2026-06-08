# Түсіндірме және Кодтар Каталогы: Жобаның негізгі файлдары мен функциялары

Бұл файлда бағалау конвейеріне (evaluation pipeline) жауапты әрбір негізгі бэкэнд файлының қызметі, олардың өзара байланысы және **соңғы өзгертілген толық кодтары** келтірілген. Бұл дипломдық жобаны қорғау кезінде кодтарды жылдам қарап шығуға немесе оларды өзгертуге көмектеседі.

---

## 📂 Файлдардың өзара байланыс сызбасы

1. Студент интерфейс арқылы файлдарды немесе ZIP архивті жүктейді $\rightarrow$ **[upload.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/routes/upload.js)** оларды қабылдап, ZIP болса распаковка жасап, файлдарды дискіге сақтайды және ДҚ-ға (`SubmissionFile`) жазады.
2. Тексерісті бастау үшін **[evaluate.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/routes/evaluate.js)** шақырылады. Ол бірінші кезекте Puppeteer арқылы скриншот алады, содан кейін басты конвейер **[pipeline.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/pipeline.js)** функциясын іске қосады.
3. **[pipeline.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/pipeline.js)**:
   * **[codeAnalyzer.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/codeAnalyzer.js)** арқылы статикалық метрикаларды (тегтер, BEM, айнымалылар) есептейді.
   * **[retriever.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/retriever.js)** арқылы RAG базасынан ережелерді суырып алады.
   * **[semanticChunker.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/semanticChunker.js)** арқылы жобаның үлкен-кішілігін тексеріп, чанктерге бөледі.
   * **[geminiService.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/geminiService.js)** арқылы Gemini-ге сұраныс жібереді (кезекпен және 12 секундтық квота задержкасымен).
   * **[decisionTree.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/decisionTree.js)** арқылы чанктардың нәтижесін біріктіріп (медианамен), шешімдер ағашы арқылы соңғы грейдті қояды.
4. Нәтиже ДҚ-ға сақталып, студентке қайтарылады.

---

## 1. [upload.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/routes/upload.js) (Файлдар мен ZIP жүктеу)
* **Жауап береді:** Студент жіберген файлдарды серверге жүктеу. Егер файл `.zip` болса, оны автоматты түрде распаковка жасайды, ішіндегі `.html`, `.css`, `.js` файлдарын тауып, ДҚ-ға жазады. Сондай-ақ видеоларды (`.mp4`) және суреттерді сервер дискісінде сақтайды.

```javascript
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import prisma from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Временное хранилище (в памяти или во временной папке)
const upload = multer({
  dest: 'tmp_uploads/',
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit to support video/zip
});

/** Допустимые расширения файлов для студенческих проектов */
const ALLOWED_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.js',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.zip', '.mp4',
]);

/**
 * Рекурсивно собирает все файлы из указанной директории.
 * Предотвращает уязвимости типа Zip Slip (проверяет относительные пути).
 */
function getFilesRecursively(dir, baseDir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file.startsWith('.') || file === '__MACOSX') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath);
      // Защита от Zip Slip (выход за пределы папки)
      if (relPath.startsWith('..') || path.isAbsolute(relPath)) {
        continue;
      }
      results.push({
        relPath,
        fullPath,
        size: stat.size
      });
    }
  }
  return results;
}

router.post('/', authenticate, requireRole('student'), upload.array('files', 50), async (req, res) => {
  try {
    const { title, assignmentId, classroomId, paths } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Тақырыбы (title) міндетті түрде толтырылуы керек' });
    }

    // === EDGE CASE 1: Файлы не загружены ===
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'Қате: Файл бос немесе пішімі сәйкес келмейді. .html, .css файлдарын жүктеңіз.' 
      });
    }

    // === EDGE CASE 2: Проверка форматов файлов ===
    const invalidFiles = req.files.filter(f => {
      const ext = path.extname(f.originalname).toLowerCase();
      return !ALLOWED_EXTENSIONS.has(ext);
    });
    if (invalidFiles.length > 0) {
      // Удаляем временные файлы
      req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch(e) {} });
      const badNames = invalidFiles.map(f => f.originalname).join(', ');
      return res.status(400).json({
        error: `Қате: Файл пішімі сәйкес келмейді (${badNames}). Тек .html, .css, .js, .zip, .mp4 және сурет файлдары қабылданады.`
      });
    }

    // === EDGE CASE 3: Пустые файлы ===
    const emptyFiles = req.files.filter(f => f.size === 0);
    if (emptyFiles.length > 0) {
      req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch(e) {} });
      return res.status(400).json({
        error: 'Қате: Файл бос немесе пішімі сәйкес келмейді. Бос файлдар жүктеуге болмайды.'
      });
    }

    // paths может быть строкой (если 1 файл) или массивом
    const relativePaths = Array.isArray(paths) ? paths : [paths];

    // В транзакции создаем Submission
    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.submission.create({
        data: {
          title,
          studentId: req.user.id,
          assignmentId: assignmentId || null,
          classroomId: classroomId || null,
          status: 'pending',
        },
      });

      const submissionDir = path.join(process.env.FILES_DIR || './uploads', sub.id);
      fs.mkdirSync(submissionDir, { recursive: true });

      // Переносим загруженные файлы в целевую папку
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const relPath = relativePaths[i] || file.originalname;
        const fileExt = path.extname(relPath).toLowerCase();
        
        // Создаем нужные подпапки для файла
        const targetPath = path.join(submissionDir, relPath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        
        // Перемещаем файл из временной папки в постоянную
        fs.renameSync(file.path, targetPath);

        // Если это .zip архив — распаковываем его на месте
        if (fileExt === '.zip') {
          try {
            console.log(`[Upload] Unzipping ${targetPath} to ${submissionDir}`);
            // Используем стандартную утилиту unzip, которая доступна на macOS/Linux
            execSync(`unzip -o "${targetPath}" -d "${submissionDir}"`);
            // Удаляем архив после успешной распаковки
            fs.unlinkSync(targetPath);
          } catch (unzipErr) {
            console.error('[Upload] Unzip error:', unzipErr);
            throw new Error(`ZIP архивін ашу мүмкін болмады: ${unzipErr.message}`);
          }
        }
      }

      // Сканируем папку submissionDir рекурсивно, чтобы найти и записать файлы в БД
      const allExtractedFiles = getFilesRecursively(submissionDir, submissionDir);
      
      let htmlCssJsCount = 0;
      for (const extracted of allExtractedFiles) {
        const ext = path.extname(extracted.relPath).toLowerCase();

        // Проверяем разрелен ли этот файл в ZIP-архиве (игнорируем или удаляем неразрешенные)
        if (!ALLOWED_EXTENSIONS.has(ext)) {
          try { fs.unlinkSync(extracted.fullPath); } catch (e) {}
          continue;
        }

        // В БД сохраняем текстовое содержимое только для HTML/CSS/JS файлов
        if (['.html', '.css', '.js'].includes(ext)) {
          const content = fs.readFileSync(extracted.fullPath, 'utf8');
          await tx.submissionFile.create({
            data: {
              submissionId: sub.id,
              fileName: extracted.relPath,
              fileType: ext === '.css' ? 'css' : 'html', // В БД тип html или css
              fileSize: extracted.size,
              filePath: extracted.fullPath,
              content: content,
            },
          });
          htmlCssJsCount++;
        }
      }

      return sub;
    });

    res.status(201).json({ message: 'Files uploaded successfully', submissionId: submission.id });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Error uploading files' });
  }
});

export default router;
```

---

## 2. [evaluate.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/routes/evaluate.js) (Бағалауды бастау маршруты)
* **Жауап береді:** Нақты тапсырылған жұмысқа бағалау сұранысын жібергенде, Puppeteer-ді іске қосып, студент жобасының скриншотын алады, сосын оны бағалау конвейеріне (`evaluateCode`) жібереді және дайын нәтижені ДҚ-ға (`Evaluation`, `AiFeedbackItem`) жазады.

```javascript
import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { captureScreenshot } from '../services/puppeteerService.js';
import { evaluateCode } from '../services/pipeline.js';
import prisma from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// POST /api/evaluate/:id
router.post('/:id', authenticate, requireRole('student'), async (req, res) => {
  try {
    const submissionId = req.params.id;

    // 1. Получаем submission и проверяем принадлежность пользователю
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { files: true },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Жұмыс табылмады' });
    }

    if (submission.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    if (submission.files.length === 0) {
      return res.status(400).json({ error: 'Бұл жұмыста файлдар жоқ' });
    }

    // Обновляем статус на processing
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'processing' },
    });

    // 2. Ищем index.html
    let entryHtmlPath = null;
    let firstHtmlPath = null;
    const codeFiles = [];

    for (const file of submission.files) {
      if (file.fileType === 'html') {
        if (!firstHtmlPath) firstHtmlPath = file.filePath;
        if (file.fileName.toLowerCase() === 'index.html') {
          entryHtmlPath = file.filePath;
        }
      }

      if (['html', 'css', 'js'].includes(file.fileType) || file.fileName.endsWith('.js')) {
        codeFiles.push({
          path: file.fileName,
          content: file.content,
        });
      }
    }

    entryHtmlPath = entryHtmlPath || firstHtmlPath;

    if (!entryHtmlPath) {
      await prisma.submission.update({ where: { id: submissionId }, data: { status: 'error' } });
      return res.status(400).json({ error: 'Жобада кем дегенде бір .html файл болуы керек!' });
    }

    // 3. Создаём скриншот через Puppeteer
    let screenshotBase64 = null;
    try {
      // PuppeteerService ожидает абсолютный путь. filePath от multer уже должен быть абсолютным или относительно CWD.
      const absolutePath = path.resolve(entryHtmlPath);
      screenshotBase64 = await captureScreenshot(absolutePath);
      console.log('[Evaluate] Скриншот создан успешно');
    } catch (screenshotError) {
      console.warn('[Evaluate] Ошибка создания скриншота:', screenshotError.message);
    }

    const startTime = Date.now();
    // 4. Отправляем в Gemini API (через RAG Pipeline) для анализа
    const evaluationData = await evaluateCode(codeFiles, screenshotBase64);
    const analysisTimeMs = Date.now() - startTime;
    console.log('[Evaluate] Анализ завершён, score:', evaluationData?.scores?.total);

    // 5. Сохраняем результат в БД (Evaluation)
    const savedEvaluation = await prisma.$transaction(async (tx) => {
      const evaluation = await tx.evaluation.create({
        data: {
          submissionId: submissionId,
          totalScore: evaluationData.scores.total,
          htmlScore: evaluationData.scores.html,
          cssScore: evaluationData.scores.css,
          uiScore: evaluationData.scores.ui,
          grade: evaluationData.grade,
          analysisTimeMs,
          modelUsed: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          scoreJustifications: evaluationData.scoreJustifications || null,
          learningPathRecommendations: evaluationData.learningPathRecommendations || null,
          nextAttemptSuggestion: evaluationData.nextAttemptSuggestion || null
        },
      });

      // Сохраняем feedbackItems
      if (evaluationData.feedback && Array.isArray(evaluationData.feedback)) {
        for (const item of evaluationData.feedback) {
          // Нормализация категории для Prisma Enum (HTML, CSS, UI)
          let category = 'UI';
          const catLower = (item.category || 'UI').toLowerCase();
          if (catLower.includes('html')) category = 'HTML';
          else if (catLower.includes('css')) category = 'CSS';

          await tx.aiFeedbackItem.create({
            data: {
              evaluationId: evaluation.id,
              category,
              location: item.location || 'unknown',
              issue: item.issue || 'No description',
              howToFix: item.howToFix || '',
              studyMaterials: item.studyMaterials || [],
            },
          });
        }
      }

      // Обновляем статус submission на done
      await tx.submission.update({
        where: { id: submissionId },
        data: { status: 'done' },
      });

      return evaluation;
    });

    res.json({ 
      message: 'Анализ сәтті аяқталды', 
      evaluationId: savedEvaluation.id, 
      ...evaluationData,
      files: submission.files
    });

  } catch (error) {
    console.error('[Evaluate] Ошибка:', error);
    
    // В случае ошибки обновляем статус
    try {
      await prisma.submission.update({
        where: { id: req.params.id },
        data: { status: 'error' },
      });
    } catch(e) {}
    
    res.status(500).json({ error: `Анализ кезінде қате: ${error.message}` });
  }
});

// GET /api/evaluate/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        evaluation: {
          include: {
            feedbackItems: true,
            htmlRules: true,
            cssRules: true
          }
        },
        files: true
      }
    });

    if (!submission) return res.status(404).json({ error: 'Жұмыс табылмады' });
    
    // Студент может смотреть только свои работы, учитель — любые (или свои в будущем)
    if (req.user.role === 'student' && submission.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    // Если оценки еще нет, возвращаем статус и файлы
    if (!submission.evaluation) {
      return res.json({ 
        status: submission.status,
        files: submission.files 
      });
    }

    const responseData = {
      ...submission.evaluation,
      files: submission.files
    };

    res.json(responseData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

---

## 3. [pipeline.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/pipeline.js) (Басты бағалау конвейері)
* **Жауап береді:** Жобаны тексерудің барлық қадамдарын біріктіретін негізгі менеджер. Ол статикалық метрикаларды жинап, RAG контексін тауып, чанкинг қажет пе екенін анықтайды және Gemini жауаптарын өңдеп, соңғы грейдті Шешімдер ағашына бағыттайды.

```javascript
/**
 * ============================================================
 * Pipeline v2 — Главный конвейер оценки с семантическим чанкингом
 * ============================================================
 * 
 * Двухрежимная система:
 *   Режим A (маленький файл): codeAnalyzer → retriever → callGemini → classifyQuality
 *   Режим B (большой файл):   codeAnalyzer → retriever → semanticChunker 
 *                              → callGeminiChunked (последовательно) → aggregateChunkResults 
 *                              → classifyQuality
 * 
 * Порог переключения: > 600 строк суммарно ИЛИ > 1 HTML файл
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
      // ═══ РЕЖИМ B: Семантический чанкинг + последовательные вызовы ═══
      console.log(`[Pipeline] Шаг 3: РЕЖИМ ЧАНКИНГ — ${chunks.length} чанков`);

      // Ретроспективная отправка всех чанков в Gemini API
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
```

---

## 4. [semanticChunker.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/semanticChunker.js) (Семантикалық Чанкер)
* **Жауап береді:** Жобаның жалпы жолдар санын тексеріп, 600 жолдан асса, HTML файлын cheerio арқылы семантикалық тегтерге (немесе div-терге) бөледі. Мелкие блоктарды біріктіріп, ИИ-ге баратын чанк санын барынша азайтады (әр чанк үшін 4000 символ шегі орнатылған).

```javascript
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

  // --- Merging small chunks (limit to 4000 characters) ---
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
```

---

## 5. [geminiService.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/geminiService.js) (Gemini API қорғаныс менеджері)
* **Жауап береді:** Жүйедегі нейрожелімен жұмыс. Тікелей сұранысты жібереді немесе чанктерді **кезекпен (12 секундтық паузамен)** баяу жібереді. Қателерді өңдейтін `executeGeminiCallWithRetry` функциясы арқылы `429` және `503` қатесі шыққан кезде автоматты түрде күтеді.

```javascript
/**
 * ============================================================
 * Gemini API сервис — v2 с поддержкой семантического чанкинга
 * ============================================================
 * 
 * Две стратегии вызова:
 *   1. callGemini()        — обычный вызов для маленьких файлов (< 300 строк)
 *   2. callGeminiChunked() — последовательная отправка чанков с задержкой (12с)
 * 
 * Каждый последовательный вызов:
 *   - Имеет AbortController с таймаутом 30 секунд
 *   - Получает мини-промпт с контекстом чанка (тип, индекс, всего)
 * 
 * Температура 0.1 для максимальной детерминированности.
 * Используется Gemini 2.5 Flash.
 * ============================================================
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { EXPERT_SYSTEM_PROMPT } from '../prompts/expertSystemPrompt.js';
import dotenv from 'dotenv';
import dotenvConfig from 'dotenv';
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
 * мы отправляем их друг за другом с небольшой задержкой (12 секунд).
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
```

---

## 6. [codeAnalyzer.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/codeAnalyzer.js) (Статикалық аналитика)
* **Жауап береді:** Студент кодын тез арада RegExp арқылы қарап шығып, семантикалық тегтерді, inline-стильдерді, Flexbox/Grid қолданылуын, ВЕМ тегтерін, `@media` белсенділігін табады. Бұл фактілерді ИИ-ге RAG контексімен бірге беріп, оның өтірік (галлюцинация) жауап беруін блоктайды.

```javascript
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
```

---

## 7. [decisionTree.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/decisionTree.js) (Шешімдер ағашы және чанктерді жинақтаушы)
* **Жауап береді:** Екі маңызды функция:
  1. `aggregateChunkResults` — чанктерден келген бағаларды **медиана** арқылы жинайды, бұл кезде HTML және CSS/UI бағалары мен қателері тиісті чанк типтеріне байланысты ғана есептеліп, қателерді бірегей кілт бойынша дедупликациялайды.
  2. `classifyQuality` — ИИ қателерін түзетіп, балдардың қосындысын тексереді және студентке қатаң баға грейдін қояды.

```javascript
/**
 * ============================================================
 * Decision Tree — Детерминированная оценка + Агрегатор чанков
 * ============================================================
 * 
 * Два модуля:
 *   1. classifyQuality() — строгое дерево решений для грейда (v1, не изменено)
 *   2. aggregateChunkResults() — НОВЫЙ агрегатор для объединения
 *      JSON-ответов от нескольких чанков Gemini API с распределением ролей
 * ============================================================
 */

/**
 * Детерминированное дерево решений для выставления финальной оценки и грейда.
 * Строгие пороги на основе экспертной шкалы.
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

  // Жақсы — общий >= 70 и нет критических провалов
  if (total >= 70 && html >= 20 && css >= 20 && ui >= 28) {
    return { grade: 'Жақсы', reason: 'Жақсы сапа, шағын ескертулер бар' };
  }

  // Қанағаттанарлық — общий >= 50
  if (total >= 50 && ui >= 18) {
    return { grade: 'Қанағаттанарлық', reason: 'Елеулі мәселелер бар, жақсарту қажет' };
  }

  // Қанағаттанарлықсыз — всё остальное
  return { grade: 'Қанағаттанарлықсыз', reason: 'Стандарттарды сыни бұзу анықталды' };
}

/**
 * Вычисляет медиану массива чисел.
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
 * 
 * @param {Object} item - Элемент feedback
 * @returns {string} Уникальный ключ
 */
function feedbackKey(item) {
  const category = (item.category || 'UI').toUpperCase();
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
 * 1. Собирает все feedback → удаляет дубликаты по ключу (issue + category) с разделением ролей чанков
 * 2. Собирает все scores → считает МЕДИАНУ для html, css, ui с разделением ролей чанков
 * 3. Мерджит learningPathRecommendations → уникальные по topic
 * 4. Выбирает лучший nextAttemptSuggestion (с макс. expectedImprovementPoints)
 * 5. Score justifications: берет HTML из html чанков, а CSS/UI из css чанка
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
```

---

## 8. [retriever.js](file:///Users/khim/Sabaq/diplom/testing1/backend/src/services/retriever.js) (RAG жүйесі)
* **Жауап береді:** Осы құжаттың басында айтылған RAG конвейеріне жауап береді. Студент кодын зерттеп, қажетті кілт сөздер арқылы `backend/data/` ішіндегі JSON файлдардан сәйкес академиялық ережелерді суырып алып, ИИ промптына динамикалық түрде орналастырады.

```javascript
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
```
