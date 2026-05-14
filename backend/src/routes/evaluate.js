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
    // 4. Отправляем в Groq API (через RAG Pipeline) для анализа
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
