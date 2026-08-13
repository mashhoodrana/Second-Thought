# API Reference

**Base URL:** `http://localhost:8000` (development) · `https://api.your-domain.com` (production)

All protected endpoints require:
```
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

---

## Public Endpoints

### GET /health

Returns the service health status.

**Request:** No body, no auth required.

**Response 200:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "env": "development"
}
```

---

## Protected Endpoints

### POST /investigations

Creates a new investigation session and stores the submitted content.

**Phase 1:** Text submissions only. URL and image submissions are not yet implemented.

**Request body:**
```json
{
  "content_type": "text",
  "raw_text": "The claim or content you want to investigate."
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `content_type` | `"text"` | ✅ Yes | Only `"text"` is supported in Phase 1 |
| `raw_text` | `string` | ✅ Yes (when content_type is "text") | The submitted text content |

**Response 201:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "complete",
  "created_at": "2026-08-10T00:00:00Z"
}
```

**Error responses:**

| Status | When |
|--------|------|
| `401 Unauthorized` | Missing, invalid, or expired Bearer token |
| `422 Unprocessable Entity` | Invalid body (empty text, unsupported content_type, missing raw_text) |

**Example 422 body:**
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "raw_text"],
      "msg": "raw_text must not be empty for text submissions"
    }
  ]
}
```

---

## Error Format

All errors follow FastAPI's default JSON error format:

```json
{
  "detail": "string or array of validation errors"
}
```

---

## Phase 2+ Endpoints (not yet implemented)

| Endpoint | Description |
|----------|-------------|
| `GET /investigations` | List user's investigation history |
| `GET /investigations/{session_id}` | Get full investigation result with lens findings |
| `POST /investigations/{session_id}/reflect` | Submit reflection response |
