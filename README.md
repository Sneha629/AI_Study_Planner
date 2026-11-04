# AI Study Planner

> Upload your notes, get exam-ready.

AI Study Planner turns a student's notes or textbook chapter into flashcards in seconds, then schedules revision with spaced repetition (SM-2) so every card is revised at least twice before the exam.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React + Vite, React Router, Tailwind CSS, Axios, Recharts |
| Backend | Node.js + Express, Zod, Multer, pdf-parse |
| Database | PostgreSQL (Neon) + Prisma |
| Auth | JWT + bcrypt (bcryptjs) |
| AI | LLM API for card and quiz generation |
| Testing | Jest, Supertest |
| Hosting | Vercel (client), Render (server), Neon (database) |

## Project structure

```
AI_Study_Planner/
├── client/                 React app (Vite)
│   └── src/
│       ├── api/            Axios instance with JWT interceptor
│       ├── components/     Reusable UI pieces
│       ├── context/        Auth context
│       ├── hooks/
│       ├── pages/          One file per route
│       └── utils/
├── server/                 Express API
│   ├── prisma/             schema.prisma + migrations
│   ├── src/
│   │   ├── app.js          Express app (exported for tests)
│   │   ├── index.js        Starts the server
│   │   ├── lib/            Prisma client
│   │   ├── middleware/     auth, validate, errorHandler
│   │   ├── routes/         One router per module
│   │   ├── services/       sm2, planner, streaks, ai
│   │   └── validators/     Zod schemas
│   └── tests/              Jest + Supertest
├── .github/                PR template, issue templates, CI
└── CONTRIBUTING.md         Team Git workflow
```

## Setup

**Requirements:** Node.js 20+, Git, a free [Neon](https://neon.tech) PostgreSQL database.

```bash
git clone <repo-url>
cd AI_Study_Planner

# Backend
cd server
npm install
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET
npm run db:migrate          # creates the 8 tables
npm run dev                 # http://localhost:5000/api/health

# Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

## Environment variables

**server/.env**

| Name | Purpose |
| --- | --- |
| `PORT` | API port (default 5000) |
| `CLIENT_URL` | Allowed CORS origin |
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | Secret for signing tokens |
| `JWT_EXPIRES_IN` | Token expiry (7d) |
| `LLM_API_KEY` | LLM provider key (server only) |

**client/.env** (production only)

| Name | Purpose |
| --- | --- |
| `VITE_API_URL` | Deployed API URL, e.g. `https://ai-study-planner.onrender.com/api` |

## Scripts

| Where | Command | What it does |
| --- | --- | --- |
| server | `npm run dev` | Start API with auto-reload |
| server | `npm test` | Run Jest tests |
| server | `npm run db:migrate` | Create a migration after editing `schema.prisma` |
| server | `npm run db:studio` | Browse the database in the browser |
| client | `npm run dev` | Start React dev server |
| client | `npm run build` | Production build |
| client | `npm run lint` | Lint the frontend |

## Features (v1)

F1 Auth · F2 Subjects and decks · F3 Exam date · F4 Manual cards · F5 Upload notes · F6 AI card generation · F7 Study mode · F8 SM-2 · F9 Due-today queue · F10 Exam planner · F11 Streaks · F12 AI quiz · F13 Share deck · F14 Dashboard

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, commit and pull request workflow.
