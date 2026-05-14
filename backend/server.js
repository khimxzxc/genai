import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './src/routes/auth.js';
import uploadRouter from './src/routes/upload.js';
import evaluateRouter from './src/routes/evaluate.js';
import teacherRouter from './src/routes/teacher.js';
import classroomRouter from './src/routes/classroom.js';
import studentRouter from './src/routes/student.js';

dotenv.config();

const app = express();

app.use(cors()); // Allow all for testing
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/evaluate', evaluateRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/classroom', classroomRouter);
app.use('/api/student', studentRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Сервер қатесі' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
