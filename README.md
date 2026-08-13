# Second Thought

> **Think before you trust. Learn before you share.**  
> A UNESCO Youth Hackathon 2026 submission — AI-Powered Media & Information Literacy Platform.

Second Thought helps users slow down and critically examine content before trusting or sharing it. Rather than delivering verdicts, it guides users through a structured reasoning process using six analytical lenses.

---

## Project Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Foundation & Scaffold — auth, DB, API |
| Phase 2 | 🔜 Planned | AI Lenses — LangGraph + Gemini |
| Phase 3 | 🔜 Planned | Reflection flow, STI scoring, Thinking Replay |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui |
| Backend | Python 3.12 · FastAPI · pydantic-settings |
| Database | Supabase (PostgreSQL + Auth) |
| Hosting | Vercel (frontend) · Google Cloud Run (backend) |

---

## Local Development

See [docs/local-development.md](docs/local-development.md) for the full setup guide.

**Quick start:**

```bash
# Terminal 1 — Frontend
cd frontend
npm install
cp .env.local.example .env.local   # fill in your Supabase keys
npm run dev                         # → http://localhost:3000

# Terminal 2 — Backend
cd backend
uv sync
cp .env.example .env               # fill in your Supabase keys
uv run uvicorn app.main:app --reload --port 8000  # → http://localhost:8000
```

---

## Documentation

- [Local Development Guide](docs/local-development.md)
- [Architecture Overview](docs/architecture.md)
- [API Reference](docs/api-reference.md)