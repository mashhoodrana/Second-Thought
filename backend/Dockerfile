# ─────────────────────────────────────────────────────────────────
# Dockerfile — Second Thought Backend
# Target: Google Cloud Run
# ─────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS base

# Prevent .pyc files and enable stdout/stderr flushing
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # uv settings
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# ─── Dependency install stage ──────────────────────────────────────
FROM base AS deps

# Copy dependency files
COPY pyproject.toml uv.lock* ./

# Install production deps only (no dev extras)
RUN uv sync --frozen --no-dev

# ─── Final image ───────────────────────────────────────────────────
FROM base AS final

WORKDIR /app

# Copy installed packages from deps stage
COPY --from=deps /app/.venv /app/.venv

# Copy application source
COPY app/ ./app/

# Cloud Run expects the app to listen on PORT env var (default 8080)
ENV PORT=8080

# Secrets are injected by Cloud Secret Manager at runtime — no .env in image
EXPOSE 8080

# Use shell form to dynamically bind to the PORT environment variable
CMD /app/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}

