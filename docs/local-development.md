# Local Development Guide

## Prerequisites

| Tool | Required Version | Install |
|------|-----------------|---------|
| Node.js | ≥ 22 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10 | Included with Node.js |
| Python | 3.12.x | [python.org](https://python.org) |
| uv | latest | `pip install uv` |
| Git | any | [git-scm.com](https://git-scm.com) |

You also need a **Supabase project** — create one free at [supabase.com](https://supabase.com).

---

## 1. Clone the Repository

```bash
git clone https://github.com/mashhoodrana/Second-Thought.git
cd Second-Thought
```

---

## 2. Supabase Setup

### 2a. Create your project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **API keys** from Settings → API

### 2b. Apply the database migration
1. Open your Supabase project → SQL Editor
2. Paste the contents of `backend/supabase/migrations/001_initial.sql`
3. Click **Run**

This creates the `profiles`, `investigation_sessions`, and `investigation_inputs` tables with RLS policies.

---

## 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Second Thought
NEXT_PUBLIC_APP_ENV=development
```

Start the dev server:
```bash
npm run dev
# → http://localhost:3000
```

Useful commands:
```bash
npm run build      # Production build (also validates types)
npm run lint       # ESLint
npx tsc --noEmit   # Type-check without building
```

---

## 4. Backend Setup

```bash
cd backend
uv sync            # Install all dependencies from uv.lock
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
APP_ENV=development
CORS_ORIGINS=http://localhost:3000
```

> **Note:** The backend uses only `SUPABASE_URL` and `SUPABASE_ANON_KEY`. JWT verification is performed by calling the Supabase Auth API (no JWT secret required). Database writes use the user's own access token and pass through RLS.

Start the backend:
```bash
uv run uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
# → http://localhost:8000/health
```

Run tests:
```bash
uv run pytest tests/ -v
```

---

## 5. Verify Everything Works

1. Frontend running at `http://localhost:3000`
2. Backend running at `http://localhost:8000`
3. `GET http://localhost:8000/health` → `{"status":"ok"}`
4. Register a new account at `http://localhost:3000/register`
5. Submit a text claim at `http://localhost:3000/investigate`
6. Confirm rows created in Supabase dashboard → Table Editor

---

## Environment Variables Reference

### Frontend (`frontend/.env.local`)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | ✅ Yes |
| `NEXT_PUBLIC_API_BASE_URL` | FastAPI base URL | ✅ Yes |
| `NEXT_PUBLIC_APP_NAME` | Display name | No |
| `NEXT_PUBLIC_APP_ENV` | `development` or `production` | No |

### Backend (`backend/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `SUPABASE_ANON_KEY` | Supabase public anon key | ✅ Yes |
| `APP_ENV` | `development` or `production` | No |
| `CORS_ORIGINS` | Comma-separated allowed origins | ✅ Yes |
