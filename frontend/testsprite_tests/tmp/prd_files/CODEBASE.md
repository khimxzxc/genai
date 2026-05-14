# Project Codebase Summary: AI Code Reviewer for LMS

## Overview
This project is an automated AI-driven system for evaluating student HTML/CSS projects. It features role-based access for students and teachers, classroom management, and detailed AI feedback generated via Groq (LLaMA-4).

## Tech Stack
- **Frontend**: Vite + React, Tailwind CSS v4, React Router v7.
- **Backend**: Node.js + Express.js.
- **Database**: Supabase (PostgreSQL) with Prisma ORM.
- **AI Integration**: Groq SDK (LLaMA-4 model).
- **Rendering**: Puppeteer for screenshot generation and visual analysis.

## Project Structure
- `/frontend`: React application using Vite.
  - `src/pages`: Main application pages (Login, Register, Dashboards, Upload, Results, Submissions).
  - `src/components`: Reusable UI components.
  - `src/hooks`: Custom React hooks (e.g., `useAuth`).
- `/backend`: Node.js Express server.
  - `src/routes`: API endpoints for auth, classrooms, submissions, and evaluation.
  - `prisma/schema.prisma`: Database schema definition.
  - `prompts`: System prompts for AI evaluation.
- `/testsprite_tests`: TestSprite configuration and results.

## Key Features
1. **Authentication**: Separate registration and login flows for students and teachers.
2. **Classrooms**: Teachers can create classes and invite students via codes.
3. **Submission System**: Students upload HTML/CSS folders; the system renders them and performs AI analysis.
4. **AI Evaluation**: Multi-modal analysis (code + visual) providing scores (HTML, CSS, UI/UX) and detailed feedback in Kazakh.
5. **Teacher Dashboard**: Overview of student progress, class statistics, and exportable reports.
6. **Student Dashboard**: submission history and detailed performance breakdowns.

## Routes (Frontend)
- `/login`: User authentication.
- `/register`: Account creation with role selection.
- `/teacher/dashboard`: Management of classes and students.
- `/student/dashboard`: Student's project overview.
- `/upload`: Project submission interface.
- `/result`: Detailed view of AI evaluation results.
- `/submissions`: History of student submissions.

## Current Status
- Authentication and role-based navigation implemented.
- Classroom management logic in place.
- AI evaluation pipeline using Groq and Puppeteer integrated.
- Frontend and Backend are separate services.
