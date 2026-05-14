import jwt from 'jsonwebtoken';
import prisma from '../db.js';
/**
 * Проверяет Access Token из заголовка Authorization: Bearer <token>
 * Добавляет req.user = { id, email, role }
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Токен жоқ' });
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Проверяем что пользователь ещё активен
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Пайдаланушы табылмады' });
    }
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth] Пайдаланушыны растау қатесі:', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Токен мерзімі өтті', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Жарамсыз токен' });
  }
}
/**
 * Проверяет что пользователь имеет нужную роль
 * Использование: requireRole('teacher') или requireRole('student', 'teacher')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Авторизация қажет' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Рұқсат жоқ. Қажетті рөл: ${roles.join(' немесе ')}`,
      });
    }
    next();
  };
}
