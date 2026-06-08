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

        // Проверяем разрешен ли этот файл в ZIP-архиве (игнорируем или удаляем неразрешенные)
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
