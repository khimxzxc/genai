import { Router } from 'express';
import { nanoid } from 'nanoid';
import prisma from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// ─── POST /api/classroom ─────────────────────────────────
// Учитель создаёт класс
router.post('/', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const { name, description } = req.body;

    // Генерируем код приглашения (6 символов)
    const inviteCode = nanoid(6).toUpperCase();

    const classroom = await prisma.classroom.create({
      data: {
        name,
        description,
        teacherId: req.user.id,
        inviteCode: inviteCode,
        inviteCodeExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
      },
    });

    res.status(201).json({ classroom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/classroom/my ──────────────────────────────
// Учитель видит свои классы
router.get('/my', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      where: { teacherId: req.user.id },
      include: {
        students: {
          include: {
            student: { select: { fullName: true, email: true } },
          },
        },
        _count: {
          select: { students: true, submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ classrooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/classroom/join ──────────────────────
// Студент присоединяется к классу по коду
router.post('/join', authenticate, requireRole('student'), async (req, res) => {
  try {
    const { inviteCode } = req.body;

    const classroom = await prisma.classroom.findUnique({
      where: { inviteCode },
    });

    if (!classroom) {
      return res.status(404).json({ error: 'Класс табылмады (қате код)' });
    }

    if (classroom.inviteCodeExpiresAt && classroom.inviteCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Код мерзімі өтті' });
    }

    // Проверяем что студент уже не в этом классе
    const existing = await prisma.classroomStudent.findUnique({
      where: { classroomId_studentId: { classroomId: classroom.id, studentId: req.user.id } },
    });

    if (existing) {
      return res.status(400).json({ error: 'Сіз бұл класста уже барсыз' });
    }

    // Добавляем студента в класс
    const joinedStudent = await prisma.classroomStudent.create({
      data: {
        classroomId: classroom.id,
        studentId: req.user.id,
      },
      include: {
        classroom: {
          include: {
            teacher: { select: { fullName: true } }
          }
        },
      },
    });

    res.json({ message: 'Класқа сәтті қосылдыңыз', classroom: joinedStudent.classroom });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/classroom/:id/students ────────────────────
// Учитель видит всех студентов в классе со статистикой
router.get('/:id/students', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: req.params.id },
    });

    if (!classroom || classroom.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const students = await prisma.classroomStudent.findMany({
      where: { classroomId: req.params.id },
      include: {
        student: { select: { fullName: true, email: true } },
      },
    });

    // Для каждого студента считаем статистику
    const studentStats = await Promise.all(
      students.map(async (cs) => {
        const submissions = await prisma.submission.findMany({
          where: {
            studentId: cs.studentId,
            classroomId: req.params.id,
          },
          include: {
            evaluation: {
              select: {
                totalScore: true,
                htmlScore: true,
                cssScore: true,
                uiScore: true,
                grade: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        const evaluations = submissions.filter((s) => s.evaluation);
        const scores = evaluations.map((s) => s.evaluation.totalScore);

        return {
          studentId: cs.studentId,
          fullName: cs.student.fullName,
          email: cs.student.email,
          joinedAt: cs.joinedAt,
          totalSubmissions: submissions.length,
          evaluatedCount: evaluations.length,
          avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
          lastScore: scores[0] ?? null,
          bestScore: scores.length ? Math.max(...scores) : null,
          lastSubmission: submissions[0] ?? null,
        };
      })
    );

    res.json({ students: studentStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/classroom/:id/analytics ────────────────────
// Аналитика для одного класса
router.get('/:id/analytics', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: req.params.id },
    });

    if (!classroom || classroom.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const submissions = await prisma.submission.findMany({
      where: { classroomId: req.params.id },
      include: {
        evaluation: {
          select: { totalScore: true, htmlScore: true, cssScore: true, uiScore: true, grade: true }
        }
      }
    });

    const evaluations = submissions.filter(s => s.evaluation).map(s => s.evaluation);
    
    const stats = {
      totalSubmissions: submissions.length,
      evaluatedCount: evaluations.length,
      avgTotalScore: evaluations.length ? Math.round(evaluations.reduce((a, b) => a + b.totalScore, 0) / evaluations.length) : 0,
      avgHtmlScore: evaluations.length ? Math.round(evaluations.reduce((a, b) => a + b.htmlScore, 0) / evaluations.length) : 0,
      avgCssScore: evaluations.length ? Math.round(evaluations.reduce((a, b) => a + b.cssScore, 0) / evaluations.length) : 0,
      avgUiScore: evaluations.length ? Math.round(evaluations.reduce((a, b) => a + b.uiScore, 0) / evaluations.length) : 0,
      gradeDistribution: evaluations.reduce((acc, curr) => {
        acc[curr.grade] = (acc[curr.grade] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/classroom/:id ────────────────────────────
// Учитель удаляет класс
router.delete('/:id', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: req.params.id },
    });

    if (!classroom || classroom.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    await prisma.classroom.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Класс сәтті өшірілді' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/classroom/:id/students/:studentId ────────
// Учитель удаляет студента из класса
router.delete('/:id/students/:studentId', authenticate, requireRole('teacher'), async (req, res) => {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: req.params.id },
    });

    if (!classroom || classroom.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    await prisma.classroomStudent.delete({
      where: {
        classroomId_studentId: {
          classroomId: req.params.id,
          studentId: req.params.studentId,
        },
      },
    });

    res.json({ message: 'Студент класстан шығарылды' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
