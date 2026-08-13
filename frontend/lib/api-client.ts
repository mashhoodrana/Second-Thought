import { createClient } from "@/lib/supabase/client";
import type {
  InvestigationCreate,
  InvestigationResponse,
  InvestigationDetailResponse,
  ThinkingResponse,
  ReflectionResponse
} from "@/lib/types";
import { ApiError } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * Obtains the current Supabase session's access token.
 * Returns null if the user is not authenticated.
 */
async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/**
 * Base fetch wrapper that:
 *  1. Attaches Authorization: Bearer <token> from the current Supabase session
 *  2. Sets Content-Type: application/json
 *  3. Throws ApiError on non-2xx responses
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body?.detail) {
        if (typeof body.detail === "string") {
          detail = body.detail;
        } else if (Array.isArray(body.detail)) {
          detail = body.detail
            .map((err: any) => {
              const loc = err.loc ? `[${err.loc.join(".")}] ` : "";
              return `${loc}${err.msg}`;
            })
            .join("; ");
        } else if (typeof body.detail === "object") {
          detail = JSON.stringify(body.detail);
        }
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(response.status, detail);
  }

  return response.json() as Promise<T>;
}

// ── API Methods ──────────────────────────────────────────────────────────────

/**
 * POST /investigations — submit content for investigation.
 * Attaches the current user's Supabase JWT automatically.
 */
export async function submitInvestigation(
  data: InvestigationCreate,
): Promise<InvestigationResponse> {
  return apiFetch<InvestigationResponse>("/investigations", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * GET /investigations — retrieve the list of user's past investigations.
 */
export async function listInvestigations(): Promise<InvestigationResponse[]> {
  return apiFetch<InvestigationResponse[]>("/investigations", {
    method: "GET",
  });
}

/**
 * GET /investigations/{session_id} — fetch detailed findings for a session.
 */
export async function getInvestigation(
  sessionId: string,
): Promise<InvestigationDetailResponse> {
  return apiFetch<InvestigationDetailResponse>(`/investigations/${sessionId}`, {
    method: "GET",
  });
}

/**
 * GET /health — check backend availability.
 */
export async function checkHealth(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/health");
}

/**
 * GET /investigations/{session_id}/thinking — retrieve critical thinking data.
 */
export async function getThinkingData(
  sessionId: string,
): Promise<ThinkingResponse> {
  return apiFetch<ThinkingResponse>(`/investigations/${sessionId}/thinking`, {
    method: "GET",
  });
}

/**
 * POST /investigations/{session_id}/reflection — submit user reflection.
 */
export async function submitReflection(
  sessionId: string,
  initialReaction?: string,
  postAnalysisReaction?: string,
  whatChanged?: string,
): Promise<ReflectionResponse> {
  return apiFetch<ReflectionResponse>(`/investigations/${sessionId}/reflection`, {
    method: "POST",
    body: JSON.stringify({
      initial_reaction: initialReaction,
      post_analysis_reaction: postAnalysisReaction,
      what_changed: whatChanged,
    }),
  });
}

/**
 * POST /investigations/{session_id}/share-decision — submit final share decision.
 */
export async function submitShareDecision(
  sessionId: string,
  shareDecision: string,
): Promise<ReflectionResponse> {
  return apiFetch<ReflectionResponse>(`/investigations/${sessionId}/share-decision`, {
    method: "POST",
    body: JSON.stringify({
      share_decision: shareDecision,
    }),
  });
}

/**
 * POST /investigations/{session_id}/retry — retry a failed or stalled investigation.
 */
export async function retryInvestigation(
  sessionId: string,
): Promise<InvestigationResponse> {
  return apiFetch<InvestigationResponse>(`/investigations/${sessionId}/retry`, {
    method: "POST",
  });
}

/**
 * DELETE /investigations/{session_id} — delete an investigation session.
 */
export async function deleteInvestigation(
  sessionId: string,
): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/investigations/${sessionId}`, {
    method: "DELETE",
  });
}


