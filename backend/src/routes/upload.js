import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Временное хранилище (в памяти или во временной папке)
const upload = multer({
  dest: 'tmp_uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.post('/', authenticate, requireRole('student'), upload.array('files', 50), async (req, res) => {
  try {
    const { title, assignmentId, classroomId, paths } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No valid files uploaded' });
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

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const relPath = relativePaths[i] || file.originalname;
        const fileExt = path.extname(relPath).toLowerCase();
        
        // Создаем нужные подпапки для файла
        const targetPath = path.join(submissionDir, relPath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        
        // Перемещаем файл из временной папки в постоянную
        fs.renameSync(file.path, targetPath);

        // Сохраняем в БД только текст для ИИ (HTML, CSS, JS)
        if (['.html', '.css', '.js'].includes(fileExt)) {
          const content = fs.readFileSync(targetPath, 'utf8');
          await tx.submissionFile.create({
            data: {
              submissionId: sub.id,
              fileName: relPath,
              fileType: fileExt === '.css' ? 'css' : 'html', // В БД только html или css
              fileSize: file.size,
              filePath: targetPath, // Абсолютный/относительный путь для Puppeteer
              content: content,
            },
          });
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
