import { Router } from 'express';
import prisma from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// Все маршруты доступны только teacher
router.use(authenticate, requireRole('teacher'));

// ─── GET /api/teacher/students ─────────────────────────────
// Список всех студентов с их статистикой
router.get('/students', async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
        studentProfile: {
          select: { groupName: true, course: true, speciality: true, studentCode: true },
        },
        submissions: {
          select: {
            id: true,
            status: true,
            evaluation: {
              select: { totalScore: true, grade: true },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    // Считаем статистику для каждого студента
    const result = students.map((s) => {
      const evaluated = s.submissions.filter((sub) => sub.evaluation);
      const scores    = evaluated.map((sub) => sub.evaluation.totalScore);
      return {
        id:            s.id,
        fullName:      s.fullName,
        email:         s.email,
        groupName:     s.studentProfile?.groupName,
        course:        s.studentProfile?.course,
        totalSubmissions: s.submissions.length,
        evaluatedCount:   evaluated.length,
        avgScore: scores.length
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null,
        bestScore:  scores.length ? Math.max(...scores) : null,
        worstScore: scores.length ? Math.min(...scores) : null,
      };
    });

    res.json({ students: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/teacher/students/:studentId/submissions ──────
// Все работы конкретного студента (фильтруем по классу, если указан)
router.get('/students/:studentId/submissions', async (req, res) => {
  try {
    const { classroomId } = req.query;
    
    // Формируем условие поиска:
    // Преподаватель должен видеть только те работы, которые относятся к его классу.
    const whereClause = { studentId: req.params.studentId };
    if (classroomId) {
      whereClause.classroomId = classroomId;
    }

    const submissions = await prisma.submission.findMany({
      where: whereClause,
      include: {
        files: { select: { fileName: true, fileType: true, fileSize: true } },
        evaluation: {
          select: {
            totalScore: true, htmlScore: true, cssScore: true, uiScore: true,
            grade: true, summary: true, createdAt: true,
          },
        },
        assignment: { select: { title: true, deadline: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/teacher/submissions/:id ─────────────────────
// Полный детальный отчёт по работе (для преподавателя)
router.get('/submissions/:id', async (req, res) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { fullName: true, email: true } },
        files:   true,
        evaluation: {
          include: {
            htmlRules:     { orderBy: { ruleCode: 'asc' } },
            cssRules:      { orderBy: { ruleCode: 'asc' } },
            feedbackItems: { orderBy: { severity: 'asc' } },
            w3cViolations: true,
          },
        },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Жұмыс табылмады' });
    }

    res.json({ submission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/teacher/statistics ──────────────────────────
// Общая статистика по всем группам
router.get('/statistics', async (req, res) => {
  try {
    const [totalStudents, totalSubmissions, evaluations] = await Promise.all([
      prisma.user.count({ where: { role: 'student' } }),
      prisma.submission.count(),
      prisma.evaluation.findMany({
        select: { totalScore: true, htmlScore: true, cssScore: true, uiScore: true, grade: true },
      }),
    ]);

    const scores = evaluations.map((e) => e.totalScore);
    const gradeCount = evaluations.reduce((acc, e) => {
      acc[e.grade] = (acc[e.grade] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalStudents,
      totalSubmissions,
      evaluatedCount: evaluations.length,
      avgScore:  scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      gradeDistribution: gradeCount,
      avgHtml: Math.round(evaluations.reduce((a, e) => a + e.htmlScore, 0) / (evaluations.length || 1)),
      avgCss:  Math.round(evaluations.reduce((a, e) => a + e.cssScore,  0) / (evaluations.length || 1)),
      avgUi:   Math.round(evaluations.reduce((a, e) => a + e.uiScore,   0) / (evaluations.length || 1)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/teacher/assignments ────────────────────────
// Создать задание
router.post('/assignments', async (req, res) => {
  try {
    const { title, description, requirements, maxAttempts, deadline } = req.body;

    const assignment = await prisma.assignment.create({
      data: {
        teacherId:   req.user.id,
        title,
        description,
        requirements,
        maxAttempts: maxAttempts ?? 3,
        deadline:    deadline ? new Date(deadline) : null,
      },
    });

    res.status(201).json({ assignment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/teacher/students/:studentId/progress ────────
router.get('/students/:studentId/progress', async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { studentId: req.params.studentId },
      include: {
        evaluation: { select: { totalScore: true, createdAt: true } },
      },
      orderBy: { createdAt: 'asc' }, // Хронологический порядок
    });

    const progress = submissions
      .filter((s) => s.evaluation)
      .map((s, index) => ({
        attempt: index + 1,
        date: s.evaluation.createdAt,
        score: s.evaluation.totalScore,
      }));

    res.json({ progress });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/teacher/export/classroom/:id ─────────────────
// Заглушка для экспорта (CSV/Excel)
router.get('/export/classroom/:id', async (req, res) => {
  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: req.params.id },
      include: {
        students: {
          include: {
            student: true,
          }
        }
      }
    });

    if (!classroom || classroom.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    // Здесь можно сгенерировать CSV
    res.json({ message: 'Export function placeholder. Returns data that could be saved as CSV.', classroomId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
