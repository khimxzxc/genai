import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/** Генерация токенов */
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
}

// ─── POST /api/auth/register ───────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role = 'student', groupName, course } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, пароль және аты-жөні міндетті' });
    }

    // Разрешаем только student и teacher при регистрации
    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ error: 'Жарамсыз рөл' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Бұл email тіркелген' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Создаём пользователя + профиль студента в транзакции
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { email, passwordHash, fullName, role },
      });

      if (role === 'student') {
        await tx.studentProfile.create({
          data: {
            userId: newUser.id,
            groupName: groupName ?? null,
            course: course ? Number(course) : null,
          },
        });
      }

      return newUser;
    });

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Сохраняем refresh token в БД
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
      },
    });

    res.status(201).json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Тіркелу қатесі' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Email немесе пароль қате' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Email немесе пароль қате' });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Кіру қатесі' });
  }
});

// ─── POST /api/auth/refresh ────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token жоқ' });
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const session = await prisma.session.findUnique({
      where: { refreshToken },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Сессия мерзімі өтті' });
    }

    // Ротация токена — старый удаляем, выдаём новый
    await prisma.session.delete({ where: { refreshToken } });

    const tokens = generateTokens(payload.userId);

    await prisma.session.create({
      data: {
        userId: payload.userId,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Жарамсыз refresh token' });
  }
});

// ─── POST /api/auth/logout ─────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.session.deleteMany({ where: { refreshToken } });
    }
    res.json({ message: 'Жүйеден шықтыңыз' });
  } catch (err) {
    res.status(500).json({ error: 'Logout қатесі' });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, fullName: true, role: true,
        studentProfile: {
          select: { groupName: true, course: true, speciality: true, studentCode: true },
        },
      },
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Қате' });
  }
});

export default router;
