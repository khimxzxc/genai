# Backend Codebase Documentation (TestSprite)

## Project Overview
This is a Node.js/Express backend for an AI-powered Student Code Review system. It evaluates HTML/CSS projects using Groq (LLaMA-3.3-70B) and Puppeteer for visual analysis.

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **AI:** Groq SDK (Llama-3.3-70B)
- **Visuals:** Puppeteer (Screenshots)

## Environment Variables (.env)
- `PORT`: Server port (default: 3000)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for signing tokens
- `GROQ_API_KEY`: API key for Groq Cloud

## API Routes & Authentication

### Authentication
All routes except `/api/auth/*` require a Bearer token in the `Authorization` header.
- **Header:** `Authorization: Bearer <JWT_TOKEN>`

#### Endpoints:
- `POST /api/auth/register`: Register a new user (student or teacher).
- `POST /api/auth/login`: Login and receive `accessToken` and `refreshToken`.

### Submissions & Evaluation
- `POST /api/upload`: 
    - **Access:** Student only.
    - **Body:** `multipart/form-data` (files, title, assignmentId).
    - **Purpose:** Upload HTML/CSS project files.
- `POST /api/evaluate/:id`: 
    - **Access:** Student only.
    - **Purpose:** Triggers the AI pipeline (Analysis -> Screenshot -> Groq -> Translation -> Prisma Save).
- `GET /api/evaluate/:id`:
    - **Access:** Authenticated user.
    - **Purpose:** Retrieve full evaluation results (scores, feedback, learning path).

### Student Dashboard
- `GET /api/student/dashboard`: Get summary metrics.
- `GET /api/student/submissions`: Get history of uploads.

## Key Services (`src/services/`)
- `pipeline.js`: Orchestrates the evaluation flow.
- `groqService.js`: Handles communication with LLaMA via Groq API.
- `retriever.js`: RAG logic for fetching relevant HTML/CSS rules.
- `puppeteerService.js`: Creates screenshots of the student's code.
- `codeAnalyzer.js`: Static analysis (counting tags, checking semantics).
- `translateToKazakh.js`: Second pass for feedback translation.

## Database Schema (`prisma/schema.prisma`)
- `User`: Roles (student, teacher).
- `Submission`: Links files to evaluations.
- `Evaluation`: Stores scores and AI reasoning.
- `AiFeedbackItem`: Stores specific line-by-line feedback.

## Test Instructions for TestSprite
1. **Login Flow:** Test with `test.student.20260506_001@example.com` / `password123`.
2. **Evaluation:** When testing `/api/evaluate/:id`, ensure a submission exists first.
3. **Data Integrity:** Check that scores are integers (0-100) and categories are strictly HTML, CSS, or UI.
