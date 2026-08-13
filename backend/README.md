# Second Thought — FastAPI Backend

This directory houses the FastAPI backend application for **Second Thought**, an AI-powered media and information literacy platform.

---

## Technical Stack
- **Framework:** FastAPI (Python 3.12+)
- **Orchestration:** LangGraph (StateGraph pipeline)
- **Database / Auth:** Supabase (PostgREST via Row-Level Security)
- **LLM Provider:** Google Gemini API (`google-genai` SDK)
- **Search Provider:** Tavily Search API

---

## Local Setup

### 1. Prerequisites
- **Python 3.12+**
- **uv** (high-performance Python package installer and resolver)

If `uv` is not installed, install it using:
```bash
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 2. Install Dependencies
Initialize the virtual environment and sync dependencies:
```bash
uv sync
```

### 3. Environment Configuration
Copy the template configuration file to `.env`:
```bash
cp .env.example .env
```
Fill in the values in your `.env` file (these are loaded at runtime):

#### Public Configuration Values:
- `SUPABASE_URL`: The API URL of your Supabase project (e.g. `https://ref.supabase.co`).
- `SUPABASE_ANON_KEY`: The public anon API key of your Supabase project.
- `APP_ENV`: Application environment (`development`, `production`, or `test`).
- `CORS_ORIGINS`: Comma-separated list of allowed frontend origins (e.g. `http://localhost:3000`).

#### Server-Only Secrets (Never commit these!):
- `GEMINI_API_KEY`: Your Gemini API key for claim analysis.
- `SEARCH_API_KEY`: Your Tavily API key for search evidence extraction.

---

## Running the Backend Locally

### Development Mode
Start the FastAPI server with auto-reload enabled:
```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Production-Style Mode (Local)
Start the server without auto-reload, matching production behavior:
```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Testing

### Run pytest suite
Execute unit and integration tests (Supabase client/operations are mocked out for offline suitability):
```bash
uv run pytest
```

### Run acceptance tests
To run end-to-end acceptance tests, you must specify your test Supabase instance URL and key in the shell environments:
```bash
$env:SUPABASE_URL="https://your-project-ref.supabase.co"
$env:SUPABASE_ANON_KEY="your-anon-key"
uv run python tests/run_acceptance_tests.py
```

---

## Health Check Endpoint
A public, unauthenticated health check is available at:
- **`GET /health`**

Response payload format:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "env": "development"
}
```

---

## Docker / Google Cloud Run

### 1. Build Docker Image Locally
```bash
docker build -t second-thought-backend .
```

### 2. Run Container Locally
To run the built Docker container locally, pass in your environment variables:
```bash
docker run --env-file .env -p 8080:8080 second-thought-backend
```
Then verify via `GET http://localhost:8080/health`.

### 3. Google Cloud Run Deployment Prerequisites
When deploying the container to Google Cloud Run:
- The service must bind to `0.0.0.0` (handled by the CMD in the `Dockerfile`).
- The port must dynamically bind to the Cloud Run `PORT` environment variable (handled automatically via uvicorn in our `Dockerfile`).
- Do **not** bake environment variables/secrets into the Docker image. Inject them at runtime using **Cloud Secret Manager** or Cloud Run environment variables.
