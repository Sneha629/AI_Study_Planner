# AI Study Planner

> Upload your notes, get exam-ready.

AI Study Planner turns a student's notes or textbook chapter into flashcards in seconds, then schedules revision with spaced repetition (SM-2) so every card is revised at least twice before the exam.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React + Vite, React Router, Tailwind CSS, Axios, Recharts |
| Backend | Node.js + Express, Zod, Multer, pdf-parse |
| Database | MongoDB (Atlas) + Mongoose |
| Auth | JWT + bcrypt (bcryptjs) |
| AI | LLM API for card and quiz generation |
| Testing | Jest, Supertest |
| Hosting | Vercel (client), Render (server), MongoDB Atlas (database) |

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
│   ├── src/
│   │   ├── app.js          Express app (exported for tests)
│   │   ├── index.js        Connects to MongoDB, starts the server
│   │   ├── config/         Database connection
│   │   ├── models/         8 Mongoose models (PRD Section 7)
│   │   ├── middleware/     auth, validate, errorHandler
│   │   ├── routes/         One router per module
│   │   ├── services/       sm2, planner, streaks, ai
│   │   └── validators/     Zod schemas
│   └── tests/              Jest + Supertest
├── .github/                PR template, issue templates, CI
└── CONTRIBUTING.md         Team Git workflow
```

## Setup

**Requirements:** Node.js 20+, Git, a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

```bash
git clone <repo-url>
cd AI_Study_Planner

# Backend
cd server
npm install
cp .env.example .env        # then fill in MONGODB_URI and JWT_SECRET
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
| `MONGODB_URI` | MongoDB Atlas connection string |
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
| client | `npm run dev` | Start React dev server |
| client | `npm run build` | Production build |
| client | `npm run lint` | Lint the frontend |

## Features (v1)

F1 Auth · F2 Subjects and decks · F3 Exam date · F4 Manual cards · F5 Upload notes · F6 AI card generation · F7 Study mode · F8 SM-2 · F9 Due-today queue · F10 Exam planner · F11 Streaks · F12 AI quiz · F13 Share deck · F14 Dashboard

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, commit and pull request workflow, and [docs/API.md](docs/API.md) for request and response shapes.
