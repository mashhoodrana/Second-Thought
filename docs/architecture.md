# Architecture Overview

## System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                      FRONTEND                             │
│   Next.js 16 (App Router) · TypeScript · Tailwind v4     │
│   shadcn/ui · Framer Motion · Supabase Auth (client)     │
│                                                           │
│   • User-facing UI                                        │
│   • Supabase Auth (session management via cookies)       │
│   • Sends Bearer token to FastAPI on every API call      │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTPS + Bearer JWT
┌──────────────────────▼───────────────────────────────────┐
│                      BACKEND                              │
│   Python 3.12 · FastAPI 0.141                            │
│                                                           │
│   JWT verification:                                       │
│     supabase.auth.get_user(token) → Supabase Auth API    │
│     (no JWT secret stored on backend)                    │
│                                                           │
│   DB operations:                                          │
│     User-scoped Supabase client (postgrest.auth(token))  │
│     → all writes pass through RLS as authenticated user  │
│                                                           │
│   Phase 2+: LangGraph → GeminiProvider → google-genai   │
└──────────────┬───────────────────────────────────────────┘
               │
┌──────────────▼──────────┐    ┌─────────────────────────┐
│      SUPABASE            │    │   Qdrant (Phase 2+)     │
│  PostgreSQL + Auth       │    │   Vector search         │
│  • JWT issuance          │    └─────────────────────────┘
│  • Auth API (verify)     │
│  • RLS-protected tables  │    ┌─────────────────────────┐
│  • Storage               │    │  SearchProvider (P2+)   │
└─────────────────────────┘    │  TBD provider           │
                                └─────────────────────────┘
```

## Authentication Flow

```
REGISTER
  1. RegisterForm → supabase.auth.signUp({ email, password, options.data.display_name })
  2. Supabase creates auth.users row + issues JWT
  3. DB trigger fires → inserts public.profiles row
  4. @supabase/ssr stores session in cookies
  5. middleware.ts reads cookie → allows (protected)/* routes
  6. Redirect to /investigate

LOGIN
  1. LoginForm → supabase.auth.signInWithPassword({ email, password })
  2. Supabase validates → returns session + JWT
  3. @supabase/ssr stores in cookies
  4. Redirect to /investigate

PROTECTED API CALL
  1. Frontend: lib/api-client.ts reads session.access_token
  2. Sends: Authorization: Bearer <access_token>
  3. FastAPI: get_current_user() dependency
     → calls supabase.auth.get_user(token) (HTTP to Supabase Auth API)
     → returns UserContext(user_id)
  4. Route handler creates user-scoped DB client
     → postgrest.auth(token) → operations pass through RLS
```

## Database Schema (Phase 1)

```
auth.users (Supabase managed)
     │ 1:1 (trigger)
     ▼
public.profiles
     │ 1:N
     ▼
public.investigation_sessions
     │ 1:N
     ▼
public.investigation_inputs
```

## Component Ownership

| Responsibility | Owner |
|---------------|-------|
| UI rendering | Next.js frontend |
| Session management | Supabase Auth + @supabase/ssr |
| JWT verification | Supabase Auth API (via backend HTTP call) |
| DB operations | FastAPI (user-scoped, RLS-enforced) |
| Secret management | `.env` files → Cloud Secret Manager (production) |

## Phase 2+ Architecture (not yet implemented)

```
AI Orchestration:  LangGraph StateGraph
                        ↓
                   LLMProvider (Protocol)
                        ↓
                   GeminiProvider → google-genai SDK

Search:            SearchProvider (Protocol)
                        ↓
                   ConcreteSearchProvider (TBD — Tavily/Brave/SerpAPI)
```

**Locked decisions:** Gemini model identifiers are environment-configured, never hard-coded. `langchain-google-genai` is not a mandatory dependency. LangGraph is for orchestration; Gemini calls go directly through `GeminiProvider`.
