import { Router } from 'express';
import prisma from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('student'));

// ─── GET /api/student/dashboard ──────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    // Получаем классы студента
    const myClasses = await prisma.classroomStudent.findMany({
      where: { studentId: req.user.id },
      include: {
        classroom: {
          include: {
            teacher: { select: { fullName: true } },
            _count: { select: { students: true, submissions: true } }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });

    // Получаем последние работы
    const recentSubmissions = await prisma.submission.findMany({
      where: { studentId: req.user.id },
      include: {
        classroom: { select: { name: true } },
        evaluation: { select: { totalScore: true, grade: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    res.json({
      classrooms: myClasses.map(c => c.classroom),
      recentSubmissions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/student/classrooms ──────────────────────────────
router.get('/classrooms', async (req, res) => {
  try {
    const myClasses = await prisma.classroomStudent.findMany({
      where: { studentId: req.user.id },
      include: {
        classroom: {
          include: { teacher: { select: { fullName: true } } }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });
    
    res.json({ classrooms: myClasses.map(c => c.classroom) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/student/submissions ─────────────────────────────
router.get('/submissions', async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { studentId: req.user.id },
      include: {
        classroom: { select: { name: true } },
        evaluation: { select: { totalScore: true, grade: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
