# MVP: GenAI система оценки HTML/CSS с классами и дашбордом учителя

> Полная архитектура для дипломного проекта: две регистрации (student | teacher), системы классов, детальный анализ с обоснованием каждого балла, рекомендации по обучению.

---

## 📋 Содержание

1. [Архитектура системы](#архитектура-системы)
2. [Две системы регистрации](#две-системы-регистрации)
3. [Система классов (Google Classroom)](#система-классов)
4. [Дашборд учителя](#дашборд-учителя)
5. [Детальный анализ результатов](#детальный-анализ-результатов)
6. [Обоснование баллов](#обоснование-баллов)
7. [Рекомендации по обучению](#рекомендации-по-обучению)
8. [Обновлённые маршруты API](#обновлённые-маршруты-api)

---

## 🏗️ Архитектура системы

```
┌─────────────────────────────────────────────────────────────┐
│                    СТУДЕНТ                                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Регистрация → /register (role: student)                  │
│ 2. Вход в класс (код приглашения от учителя)               │
│ 3. Загрузить проект верстки                                 │
│ 4. Просмотреть результат с детальным анализом              │
│ 5. История попыток (revisit previous submissions)           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   УЧИТЕЛЬ                                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Регистрация → /register (role: teacher)                  │
│ 2. Создать класс (как в Google Classroom)                   │
│ 3. Получить код приглашения → дать студентам               │
│ 4. Дашборд: видеть всех студентов + их результаты           │
│ 5. Фильтровать по классу, сортировать по баллам             │
│ 6. Детальный отчёт по каждому студенту:                    │
│    - Его попытки (attempt 1, 2, 3...)                       │
│    - Прогресс (балл растёт или нет)                         │
│    - Что улучшить и что учить                              │
│ 7. Экспорт результатов (CSV/Excel)                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               GROQ AI (LLaMA-4)                              │
├─────────────────────────────────────────────────────────────┤
│ • Парсер HTML (htmlparser2) — детерминированный анализ     │
│ • Парсер CSS (postcss) — детерминированный анализ          │
│ • Groq LLM — оценка UI/UX + подробные объяснения           │
│                                                              │
│ ВЫВОД:                                                       │
│ ├─ Баллы по критериям (html 0-30, css 0-30, ui 0-40)      │
│ ├─ Line-by-line анализ (где и почему ошибка)              │
│ ├─ Как исправить (с примерами кода)                        │
│ ├─ Что нужно учить (ссылки на статьи/видео)               │
│ └─ Прогресс (совет для следующей попытки)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Две системы регистрации

### Шаг 1: Выбор роли на странице регистрации

```jsx
// frontend/src/pages/RegisterPage.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function RegisterPage() {
  const [role, setRole] = useState('student');  // student | teacher
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        fullName,
        role,
        groupName: role === 'student' ? groupName : undefined,
      });

      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);

      // Редирект в зависимости от роли
      if (role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/teacher/dashboard');
      }
    } catch (err) {
      setError(err.error || 'Тіркелу қатесі');
    }
  };

  return (
    <div className="register-page">
      <h1>Тіркелу</h1>

      {/* Выбор роли */}
      <div className="role-selector">
        <button
          className={`role-btn ${role === 'student' ? 'active' : ''}`}
          onClick={() => setRole('student')}
        >
          👨‍🎓 Студент
        </button>
        <button
          className={`role-btn ${role === 'teacher' ? 'active' : ''}`}
          onClick={() => setRole('teacher')}
        >
          👨‍🏫 Оқытушы
        </button>
      </div>

      <form onSubmit={handleRegister}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Толық аты"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        {/* Только для студентов */}
        {role === 'student' && (
          <input
            type="text"
            placeholder="Оқу тобы (мысалы: ИС-21)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        )}

        <button type="submit">Тіркелу</button>
      </form>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

---

## 🏫 Система классов

### Prisma Schema обновления

```prisma
// prisma/schema.prisma добавляем:

model Classroom {
  id              String        @id @default(uuid())
  name            String        not null                    // "Веб дизайн ИС-21"
  description     String?
  teacher_id      String        not null
  invite_code     String        @unique                     // код приглашения
  invite_code_expires_at DateTime?                          // срок действия кода
  
  created_at      DateTime      @default(now())
  updated_at      DateTime      @updatedAt

  teacher         User          @relation(fields: [teacher_id], references: [id], onDelete: Cascade)
  students        ClassroomStudent[]
  assignments     Assignment[]
  submissions     Submission[]

  @@unique([teacher_id, name])                              // уникальность по учителю
  @@map("classrooms")
}

model ClassroomStudent {
  id              String        @id @default(uuid())
  classroom_id    String
  student_id      String
  joined_at       DateTime      @default(now())

  classroom       Classroom     @relation(fields: [classroom_id], references: [id], onDelete: Cascade)
  student         User          @relation(fields: [student_id], references: [id], onDelete: Cascade)

  @@unique([classroom_id, student_id])
  @@map("classroom_students")
}

// В таблице Submission добавляем связь с классом
model Submission {
  id            String        @id @default(uuid())
  student_id    String        not null
  classroom_id  String?                                     // опционально
  assignment_id String?
  // ... остальные поля
  
  classroom     Classroom?    @relation(fields: [classroom_id], references: [id], onDelete: SetNull)
}
```

### API маршруты для классов

```js
// backend/src/routes/classroom.js

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
        teacher_id: req.user.id,
        invite_code: inviteCode,
        invite_code_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
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
      where: { teacher_id: req.user.id },
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
      orderBy: { created_at: 'desc' },
    });

    res.json({ classrooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/classroom/:id/join ──────────────────────
// Студент присоединяется к классу по коду
router.post('/:id/join', authenticate, requireRole('student'), async (req, res) => {
  try {
    const { inviteCode } = req.body;

    const classroom = await prisma.classroom.findUnique({
      where: { id: req.params.id },
    });

    if (!classroom) {
      return res.status(404).json({ error: 'Класс табылмады' });
    }

    if (classroom.invite_code !== inviteCode) {
      return res.status(400).json({ error: 'Қате код' });
    }

    if (classroom.invite_code_expires_at && classroom.invite_code_expires_at < new Date()) {
      return res.status(400).json({ error: 'Код мерзімі өтті' });
    }

    // Проверяем что студент уже не в этом классе
    const existing = await prisma.classroomStudent.findUnique({
      where: { classroom_id_student_id: { classroom_id: req.params.id, student_id: req.user.id } },
    });

    if (existing) {
      return res.status(400).json({ error: 'Сіз бұл класста уже бар' });
    }

    // Добавляем студента в класс
    const joinedStudent = await prisma.classroomStudent.create({
      data: {
        classroom_id: req.params.id,
        student_id: req.user.id,
      },
      include: {
        classroom: true,
      },
    });

    res.json({ message: 'Класста қосылдыңыз', classroom: joinedStudent.classroom });
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

    if (!classroom || classroom.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Рұқсат жоқ' });
    }

    const students = await prisma.classroomStudent.findMany({
      where: { classroom_id: req.params.id },
      include: {
        student: { select: { fullName: true, email: true } },
      },
    });

    // Для каждого студента считаем статистику
    const studentStats = await Promise.all(
      students.map(async (cs) => {
        const submissions = await prisma.submission.findMany({
          where: {
            student_id: cs.student_id,
            classroom_id: req.params.id,
          },
          include: {
            evaluation: {
              select: {
                total_score: true,
                html_score: true,
                css_score: true,
                ui_score: true,
                grade: true,
              },
            },
          },
          orderBy: { created_at: 'desc' },
        });

        const evaluations = submissions.filter((s) => s.evaluation);
        const scores = evaluations.map((s) => s.evaluation.total_score);

        return {
          student_id: cs.student_id,
          fullName: cs.student.fullName,
          email: cs.student.email,
          joinedAt: cs.joined_at,
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

export default router;
```

---

## 📊 Дашборд учителя

### Структура дашборда

```jsx
// frontend/src/pages/TeacherDashboardPage.jsx

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import ClassroomCard from '../components/ClassroomCard';
import StudentListTable from '../components/StudentListTable';
import AnalyticsPanel from '../components/AnalyticsPanel';

export default function TeacherDashboardPage() {
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ sortBy: 'avgScore', order: 'desc' });

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      const data = await api.get('/classroom/my');
      setClassrooms(data.classrooms);
      if (data.classrooms.length > 0) {
        setSelectedClassroom(data.classrooms[0]);
        loadStudents(data.classrooms[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (classroomId) => {
    try {
      const data = await api.get(`/classroom/${classroomId}/students`);
      
      // Сортировка
      let sorted = [...data.students];
      if (filter.sortBy === 'avgScore') {
        sorted.sort((a, b) => 
          filter.order === 'desc' 
            ? (b.avgScore ?? 0) - (a.avgScore ?? 0)
            : (a.avgScore ?? 0) - (b.avgScore ?? 0)
        );
      } else if (filter.sortBy === 'name') {
        sorted.sort((a, b) =>
          filter.order === 'asc'
            ? a.fullName.localeCompare(b.fullName)
            : b.fullName.localeCompare(a.fullName)
        );
      }
      
      setStudents(sorted);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectClassroom = (classroom) => {
    setSelectedClassroom(classroom);
    loadStudents(classroom.id);
  };

  if (loading) return <p>Жүктелуде...</p>;

  return (
    <div className="teacher-dashboard">
      <h1>Оқытушы дашборды</h1>

      {/* Левая колонка — классы */}
      <div className="dashboard-layout">
        <aside className="classrooms-panel">
          <h2>Менің сыныптарым ({classrooms.length})</h2>
          <button className="btn-primary" onClick={() => {/* модаль создания класса */}}>
            + Сынып құру
          </button>
          
          <div className="classrooms-list">
            {classrooms.map((cls) => (
              <ClassroomCard
                key={cls.id}
                classroom={cls}
                isSelected={selectedClassroom?.id === cls.id}
                onClick={() => handleSelectClassroom(cls)}
              />
            ))}
          </div>
        </aside>

        {/* Средняя часть — студенты */}
        <main className="students-panel">
          {selectedClassroom && (
            <>
              <h2>{selectedClassroom.name}</h2>
              <p className="hint">Қосылған студент: {students.length}</p>

              {/* Фильтры и сортировка */}
              <div className="filters">
                <select 
                  value={filter.sortBy}
                  onChange={(e) => setFilter({ ...filter, sortBy: e.target.value })}
                >
                  <option value="avgScore">Орта балл бойынша</option>
                  <option value="name">Аты-жөні бойынша</option>
                  <option value="recent">Соңғы сондағы</option>
                </select>
                <button onClick={() => setFilter({ ...filter, order: filter.order === 'asc' ? 'desc' : 'asc' })}>
                  {filter.order === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* Таблица студентов */}
              <StudentListTable
                students={students}
                onStudentClick={(student) => {/* редирект на детали */}}
              />
            </>
          )}
        </main>

        {/* Правая колонка — аналитика */}
        <aside className="analytics-panel">
          {selectedClassroom && (
            <AnalyticsPanel classroomId={selectedClassroom.id} />
          )}
        </aside>
      </div>
    </div>
  );
}
```

### StudentListTable компонент

```jsx
// frontend/src/components/StudentListTable.jsx

export default function StudentListTable({ students, onStudentClick }) {
  return (
    <div className="students-table">
      <table>
        <thead>
          <tr>
            <th>Аты-жөні</th>
            <th>Email</th>
            <th>Жұмыс саны</th>
            <th>Орта балл</th>
            <th>Ең жақсы</th>
            <th>Соңғы</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.student_id} className={`score-${getGradeClass(student.avgScore)}`}>
              <td className="student-name">{student.fullName}</td>
              <td>{student.email}</td>
              <td className="center">{student.totalSubmissions}</td>
              <td className="score-cell">
                <span className="badge">{student.avgScore ?? '—'}/100</span>
              </td>
              <td className="center">{student.bestScore ?? '—'}</td>
              <td className="center">{student.lastScore ?? '—'}</td>
              <td>
                <button 
                  className="btn-small"
                  onClick={() => onStudentClick(student)}
                >
                  Түсіндіру →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getGradeClass(score) {
  if (!score) return 'unknown';
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'satisfactory';
  return 'unsatisfactory';
}
```

---

## 🔍 Детальный анализ результатов

### Структура детального отчёта студента

```
┌──────────────────────────────────────────────────────────┐
│ СТУДЕНТ: Айдана Сейткали                               │
│ КЛАСС: Веб дизайн ИС-21                                 │
│ ПОПЫТКА: #2 из 3                                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ИТОГОВЫЙ БАЛЛ: 82/100  ████████░░░░░░░░░░ Жақсы        │
│                                                          │
│ ├─ HTML Құрылымы:       24/30  ████████░░  (80%)        │
│ ├─ CSS Сапасы:         26/30  █████████░  (87%)        │
│ └─ UI/UX Интерфейс:    32/40  ████████░░░ (80%)        │
│                                                          │
├─ ӨНДІКТЕРІ: Попытка #1: 68, Попытка #2: 82 (+14 ↑)    │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 1️⃣  HTML ҚҰРЫЛЫМЫ — 24/30 пункт                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ✅ DOCTYPE + lang + charset + viewport         +5/5      │
│ ✅ Семантика (header/main/footer)             +9/10      │
│   └─ Прекрасное использование семантических   │
│      тегов. Только несколько div-ов осталось  │
│ ✅ Иерархия заголовков (h1→h2→h3)             +5/5      │
│ ✅ alt у изображений, label у inputs          +5/5      │
│ ❌ Один <br> для спейсинга (должен CSS)       -1/5      │
│                                                          │
│ СУММА: 24/30                                            │
│                                                          │
│ 🎯 ЧТО УЛУЧШИТЬ:                                       │
│   • <br> тег удалить, использовать margin    │
│   • ИТОГО: почти идеально, -1 пункт           │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 2️⃣  CSS САПАСЫ — 26/30 пункт                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ✅ BEM методология (nav__item, .hero__title) +8/8      │
│ ✅ Flexbox + Grid, нет float                 +8/8      │
│ ✅ CSS переменные (:root)                    +4/4      │
│ ✅ Нет !important                            +5/5      │
│ ❌ px вместо rem для некоторых размеров      -1/5      │
│                                                          │
│ СУММА: 26/30                                            │
│                                                          │
│ 🎯 ЧТО УЛУЧШИТЬ:                                       │
│   • body { font-size: 14px } → 0.875rem    │
│   • font-size: 20px → 1.25rem               │
│   • Учебный материал: CSS Units (MDN)       │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 3️⃣  UI/UX ИНТЕРФЕЙС — 32/40 пункт                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ✅ Визуальная иерархия                       +8/10      │
│   └─ Хорошо, но можно больше контраста      │
│ ✅ Спейсинг консистентный                    +7/8      │
│   └─ Один раздел имеет неправильный gap    │
│ ✅ Цветовой контраст (WCAG AA)               +8/8      │
│ ✅ Responsive (2 медиа-запроса)              +8/8      │
│ ❌ Композиция — нужна более интересная       +1/6      │
│   └─ Слишком минималистично, добавить          │
│      визуальных элементов (иконки, тени)     │
│                                                          │
│ СУММА: 32/40                                            │
│                                                          │
│ 🎯 ЧТО УЛУЧШИТЬ:                                       │
│   • Добавить box-shadow для карточек        │
│   • Использовать цветовые акценты           │
│   • Иконки (можно SVG или Font Awesome)      │
│   • Учебный материал: "Refactoring UI"       │
│                                                          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 📚 МЕНТОРСКИЙ КОММЕНТАРИЙ                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Айдана, сіз өте жақсы жұмыс жасадыңыз! 82 балл       │
│ — бұл "Жақсы" деңгейі. Алғашқы әрекеттен сравни      │
│ өндіктері: Попытка #1: 68 → Попытка #2: 82 (+14).     │
│                                                          │
│ НЕГІЗДЕМЕ: Сіз CSS-ді түзсіңіз (px → rem) және        │
│ семантиканы жетілдіңіз. Бұл өте жақсы прогресс!      │
│                                                          │
│ КЕЛЕСІ ҚАДАМ (Попытка #3 үшін):                        │
│ 1. Refactoring UI кітабын оқыңыз (адам орталандырсаңыз)
│ 2. Box-shadow және transition қолдану                  │
│ 3. Иконка кітапхасын (SVG) қосыңыз                     │
│ 4. Color harmony инструментіне серік болыңыз            │
│                                                          │
│ ӨНДІКТІЛІКТІҢ ДИАГРАММАСЫ:                             │
│ Попытка 1: [██████░░░░░░░░░░] 68 — База                │
│ Попытка 2: [████████░░░░░░░░] 82 — Өндік! ↑14         │
│ Попытка 3: [█████████░░░░░░░] ? — Келе жатыр...       │
│                                                          │
│ Өндіктіліктің түрі: CSS техникалық, демалыс UI        │
│ Ұсыну: "Refactoring UI" оқыңыз (5-6 сағат).           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📈 Обоснование баллов

### Как LLM обосновывает каждый балл

В промпт добавляем **justification field**:

```json
{
  "scores": {
    "total": 82,
    "html": 24,
    "css": 26,
    "ui": 32
  },
  "grade": "Жақсы",
  "scoreJustifications": {
    "html": {
      "maxScore": 30,
      "earnedScore": 24,
      "deductionReasons": [
        {
          "rule": "H1",
          "ruleName": "DOCTYPE декларациясы",
          "maxPoints": 3,
          "earnedPoints": 3,
          "passed": true,
          "detail": "✅ <!DOCTYPE html> дұрыс орналастырылған"
        },
        {
          "rule": "H11",
          "ruleName": "Инлайн стильдер",
          "maxPoints": 5,
          "earnedPoints": 4,
          "passed": false,
          "detail": "❌ 1 инлайн стиль табылды: <p style='margin-bottom: 10px'>. CSS файлына жылжыту керек. -1 пункт.",
          "location": "index.html, Line 47",
          "howToFix": "<!-- HTML-дан алып тастаңыз: -->\n<p class='content-text'>...\n\n/* CSS файлына: */\n.content-text { margin-bottom: 10px; }"
        }
      ],
      "summary": "HTML құрылымы сапалы, семантикасы дұрыс. Бір инлайн стильді алып тастасаңыз, 25/30 болады."
    },
    "css": {
      "maxScore": 30,
      "earnedScore": 26,
      "deductionReasons": [
        {
          "rule": "C5",
          "ruleName": "Шрифт өлшемінің бірлігі",
          "maxPoints": 5,
          "earnedPoints": 4,
          "passed": false,
          "detail": "⚠️  font-size: 14px қолданылған. Ағымдағы best practice: rem (0.875rem ≈ 14px). Пайдаланушы браузерде шрифтті үлкейтсе, 14px өзгермейді, ал rem өзгереді. WCAG 1.4.4. -1 пункт.",
          "locations": ["style.css, Line 12"],
          "howToFix": "body {\n  font-size: 0.875rem;  /* базалық 16px арамен */\n  line-height: 1.5;\n}",
          "wcagRef": "WCAG 2.1 — Success Criterion 1.4.4 Resize text",
          "studyLink": "MDN Web Docs — CSS Units: rem/em"
        }
      ],
      "summary": "CSS өте жақсы: BEM, Flexbox, CSS переменных. Тек px → rem өзгертіңіз, 30/30 болады."
    },
    "ui": {
      "maxScore": 40,
      "earnedScore": 32,
      "assessmentBreakdown": [
        {
          "criterion": "Визуалды иерархия",
          "maxPoints": 10,
          "earnedPoints": 8,
          "detail": "Тақырыптар салыстырмалы үлкен және ноқта түседі. Бірақ подзаголовктер мен корпус мәтінінің арасында шамадан артық қалыңдық айырмасы жоқ. h2 және p арасында контрастты 1 пункт артады."
        },
        {
          "criterion": "Спейсинг консистентсі",
          "maxPoints": 8,
          "earnedPoints": 7,
          "detail": "Margin/padding жалпы консистентті. Бірақ .section { margin-bottom: 3rem } және .card { margin-bottom: 1.5rem } араларындағы логика анық емес. -1 пункт. Ұсыну: :root-та --spacing-unit анықтап, барлығын 8px сеткасына сәйкестіктіңіз."
        },
        {
          "criterion": "Цвет және контраст",
          "maxPoints": 8,
          "earnedPoints": 8,
          "detail": "✅ Барлық мәтіндер 4.5:1 контрастта. Сынақтандырдық: https://webaim.org/resources/contrastchecker/. Тамаша!"
        },
        {
          "criterion": "Адаптивтілік",
          "maxPoints": 8,
          "earnedPoints": 8,
          "detail": "✅ 2 медиа-сұрау (768px және 1024px). Mobile-first. 375px шаршыда горизонталь скролл жоқ. Perfect."
        },
        {
          "criterion": "Композиция және эстетика",
          "maxPoints": 6,
          "earnedPoints": 1,
          "detail": "❌ Ең слаб жағы. Дизайн өте минималист және сыноша. Box-shadow, border-radius, color gradients, иконкалар, элементтердің аралығы — барлығы жоқ. Орталық білік: 'Refactoring UI' (Adam Wathan) оқыңыз немесе Dribbble-де яхши веб-дизайнды зерттеңіз."
        }
      ],
      "summary": "Функциялық айлақта — 32/40. Бірақ визуалды өндіктіліктіңіз төмен. UI/UX дизайн кітаптарын оқыңыз және Figma-да練習 жасаңыз."
    }
  },
  "feedback": [
    {
      "category": "HTML",
      "location": "index.html, Line 47",
      "issue": "Инлайн стиль <p style='margin-bottom: 10px'>. Бұл 'Separation of Concerns' принципін бұзады.",
      "howToFix": "<!-- HTML --> \n<p class='content-text'>\n\n/* CSS */\n.content-text { margin-bottom: 10px; }",
      "studyMaterials": [
        "CSS Secrets (Lea Verou) — Separation of concerns"
      ]
    },
    {
      "category": "CSS",
      "location": "style.css, Line 12",
      "issue": "font-size: 14px. WCAG 1.4.4 бойынша пайдаланушы браузерде шрифтті өзгерткенде, px өзгермейді. rem қолдану керек.",
      "howToFix": "body { font-size: 0.875rem; }\n/* немесе: */\nhtml { font-size: 16px; }\nbody { font-size: 0.875rem; }",
      "studyMaterials": [
        "WCAG 2.1 — Success Criterion 1.4.4 Resize text",
        "MDN Web Docs — CSS Units: rem and em"
      ]
    },
    {
      "category": "UI",
      "location": "Жалпы дизайн",
      "issue": "Визуалды композиция минималист. Бокс-shadows, иконки, цветовые акценты, typography rhythm — нәрседе нәрсе. UI/UX дизайн теориясы өндіктіліктілігі айтады.",
      "howToFix": "1. 'Refactoring UI' (Adam Wathan) оқыңыз\n2. Dribbble-де веб-дизайн мысалдарын ойлап үйреңіз\n3. Figma-да макеттер салыңыз\n4. Kelir.app арқылы color harmony табыңыз",
      "studyMaterials": [
        "Кітап: Refactoring UI (Adam Wathan & Steve Schoger)",
        "Құлай: Dribbble.com / Behance"
      ]
    }
  ]
}
```

---

## 🎓 Рекомендации по обучению

### Система обучающих рекомендаций (Learning Recommendations)

На основе баллов система генерирует персонализированный путь обучения:

```json
{
  "studentId": "...",
  "attemptNumber": 2,
  "currentScore": 82,
  "previousScore": 68,
  "improvement": 14,
  "improvementType": "CSS technical + HTML semantic",
  
  "learningPathRecommendations": [
    {
      "priority": 1,
      "topic": "CSS Units (px vs rem/em)",
      "importance": "HIGH",
      "reason": "Баллдарыңыз CSS-те 4 пункт жоғалтты. px → rem өзгертсеңіз, 30/30 болады.",
      "estimatedTime": "1-2 сағат",
      "resources": [
        {
          "type": "article",
          "title": "MDN Web Docs — CSS Units",
          "url": "https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Values_and_units#length"
        },
        {
          "type": "video",
          "title": "CSS-Tricks — What's the Deal With Rem?",
          "duration": "8 мин"
        }
      ],
      "practiceTask": "style.css бүкіндегі px-ті rem-ге өзгертіңіз. Тестіңіз: браузердегі font size +2-ге өзгертіңіз (Dev Tools). Сайт масштабталса — дұрыс."
    },
    {
      "priority": 2,
      "topic": "UI/UX Design Principles",
      "importance": "VERY HIGH",
      "reason": "UI бөліміңіз 32/40. Композиция өте слаб (1/6). Бұл дизайн білік табысы емес, оку қажет.",
      "estimatedTime": "10-15 сағат",
      "resources": [
        {
          "type": "book",
          "title": "Refactoring UI",
          "authors": "Adam Wathan & Steve Schoger",
          "chapters": [
            "Chapter 1: Start with system",
            "Chapter 2: Hierarchy is everything",
            "Chapter 3: Color",
            "Chapter 4: Spacing"
          ]
        },
        {
          "type": "design-system",
          "title": "Material Design System (Google)",
          "url": "https://material.io/design"
        }
      ],
      "practiceTask": "Сайтыңыз үшін color palette құрастырыңыз (primary, secondary, accent). Box-shadow қосыңыз барлық карточкаларға."
    },
    {
      "priority": 3,
      "topic": "Spacing System (8px Grid)",
      "importance": "MEDIUM",
      "reason": "Спейсинг консистентсі 7/8. Логикалық систем құрыңыз.",
      "estimatedTime": "2-3 сағат",
      "resources": [
        {
          "type": "article",
          "title": "The 8-point grid system",
          "url": "https://spec.fm/guides/design-systems"
        }
      ],
      "practiceTask": "CSS-те:root-та спейсинг переменных:--spacing-xs: 0.5rem,--spacing-sm: 1rem,--spacing-md: 1.5rem,--spacing-lg: 2rem,--spacing-xl: 3rem"
    }
  ],

  "nextAttemptSuggestion": {
    "focus": "CSS + UI/UX",
    "expectedScore": "88-92",
    "expectedImprovementPoints": 6,
    "changes": [
      "✓ px → rem (CSS 1 пункт)",
      "✓ Спейсинг систематизе (CSS 1 пункт)",
      "✓ Box-shadow + border-radius (UI 3 пункта)",
      "✓ Color palette (UI 2 пункта)"
    ]
  },

  "resourceLibrary": [
    {
      "category": "Books",
      "items": [
        "Refactoring UI (Adam Wathan)",
        "The Design of Everyday Things (Don Norman)",
        "Thinking with Type (Ellen Lupton)"
      ]
    },
    {
      "category": "Websites",
      "items": [
        { "name": "MDN Web Docs", "url": "https://developer.mozilla.org" },
        { "name": "CSS-Tricks", "url": "https://css-tricks.com" },
        { "name": "Web.dev", "url": "https://web.dev" }
      ]
    },
    {
      "category": "Design Tools",
      "items": [
        "Figma — UI/UX макеттау",
        "ColorHunt.co — color palette",
        "Dribbble — дизайн ілхамы",
        "Unsplash — суреттер"
      ]
    }
  ]
}
```

---

## 🔗 Обновлённые маршруты API

### Полный список маршрутов MVP

```
AUTHENTICATION
├─ POST   /api/auth/register                 # 2 role: student | teacher
├─ POST   /api/auth/login
├─ POST   /api/auth/refresh
├─ POST   /api/auth/logout
└─ GET    /api/auth/me

CLASSROOM (для учителя)
├─ POST   /api/classroom                      # Создать класс
├─ GET    /api/classroom/my                   # Все классы учителя
├─ GET    /api/classroom/:id                  # Детали класса
├─ POST   /api/classroom/:id/join             # Студент присоединяется
├─ GET    /api/classroom/:id/students         # Студенты в классе
├─ GET    /api/classroom/:id/analytics        # Статистика класса
└─ POST   /api/classroom/:id/export           # Экспорт CSV/Excel

STUDENT DASHBOARD
├─ GET    /api/student/dashboard              # Мои классы + последние работы
├─ GET    /api/student/classrooms             # Классы студента
└─ GET    /api/student/submissions            # История работ

SUBMISSION & EVALUATION
├─ POST   /api/submission/upload              # Загрузить файлы
├─ POST   /api/submission/:id/evaluate        # Запустить оценку
├─ GET    /api/submission/:id                 # Детали работы
├─ GET    /api/submission/:id/result          # Результат оценки (JSON)
├─ GET    /api/submission/:id/feedback        # Подробный feedback
└─ GET    /api/submission/:id/learning-path   # Рекомендации по обучению

TEACHER ANALYTICS
├─ GET    /api/teacher/students/:id           # Профиль студента
├─ GET    /api/teacher/students/:id/submissions # Его работы
├─ GET    /api/teacher/students/:id/progress  # Прогресс
├─ GET    /api/teacher/classroom/:id/stats    # Статистика класса
└─ GET    /api/teacher/export/classroom/:id   # Экспорт результатов
```

---

## 📱 Frontend структура (новые страницы)

```
frontend/src/pages/
├─ LoginPage.jsx
├─ RegisterPage.jsx                           # ← Две роли
├─ StudentDashboard/
│  ├─ StudentDashboard.jsx                    # Мои классы + работы
│  ├─ SubmitPage.jsx                          # Загрузить верстку
│  ├─ ResultPage.jsx                          # Детальный результат
│  └─ LearningPathPage.jsx                    # Рекомендации
├─ TeacherDashboard/
│  ├─ TeacherDashboard.jsx                    # Главная дашборда
│  ├─ ClassroomPage.jsx                       # Класс + студенты
│  ├─ StudentProfilePage.jsx                  # Профиль + прогресс
│  ├─ StudentSubmissionsPage.jsx              # Все работы студента
│  ├─ CreateClassroomModal.jsx                # Создать класс
│  └─ AnalyticsPage.jsx                       # Общая аналитика
└─ Components/
   ├─ ScoreCard.jsx                           # Визуализация баллов
   ├─ FeedbackCard.jsx                        # Один feedback item
   ├─ ProgressChart.jsx                       # График прогресса
   ├─ LearningResourceCard.jsx                # Ресурс для обучения
   └─ StudentTable.jsx                        # Таблица студентов
```

---

## 🎯 Итого MVP

✅ Две системы регистрации (student | teacher)
✅ Классы как в Google Classroom
✅ Дашборд учителя со статистикой
✅ Детальный анализ каждой работы студента
✅ Обоснование каждого балла (line-by-line)
✅ Рекомендации по обучению (Learning Path)
✅ История попыток с прогрессом
✅ Экспорт результатов (для учителя)
✅ Groq AI с In-Context Learning
✅ Prisma + PostgreSQL (все данные сохраняются)

---

*Версия MVP 2.0 — полная система оценки с классами и менторингом*
