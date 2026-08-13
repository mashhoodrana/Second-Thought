/**
 * Shared TypeScript types for Second Thought.
 * Used across components, hooks, and API client.
 */

// ── Investigation ────────────────────────────────────────────────────────────

export type ContentType = "text" | "image";

export interface InvestigationCreate {
  content_type: ContentType;
  raw_text: string;
}

export interface InvestigationResponse {
  session_id: string;
  status: "pending" | "processing" | "complete" | "error";
  created_at: string;
  title?: string;
}

// ── Phase 2 Findings ──────────────────────────────────────────────────────────

export interface SourceDomain {
  domain: string;
  reputation_score: number;
  reliability_signals: string[];
}

export interface SourceLensFindings {
  domains: SourceDomain[];
}

export interface EmotionLensFindings {
  sentiment: string;
  emotional_tone: string[];
  sensationalism_score: number;
  emotional_pressure_signals: string[];
  manipulative_language_detected: boolean;
}

export interface EvidenceSource {
  source_id: string;
  url: string;
  title: string;
  publisher: string;
  retrieved_at: string;
  snippet: string;
}

export interface EvidenceClaim {
  claim_text: string;
  citation_source_id: string;
  relationship: "corroborates" | "contradicts" | "unverified";
}

export interface EvidenceLensFindings {
  search_queries_generated: string[];
  claims: EvidenceClaim[];
  sources: EvidenceSource[];
}

export interface SynthesisFindings {
  what_we_found: string;
  signals_to_notice: string;
  what_remains_uncertain: string;
  what_to_check_yourself: string;
  would_you_share_now: string;
}

export interface LensFindingsMap {
  source?: SourceLensFindings;
  emotion?: EmotionLensFindings;
  evidence?: EvidenceLensFindings;
  synthesis?: SynthesisFindings;
  context?: ContextLensFindings;
  ai?: AILensFindings;
}

export interface InvestigationInputDetail {
  content_type: string;
  raw_text: string;
  sanitized_text?: string;
}

export interface InvestigationDetailResponse {
  session_id: string;
  status: "pending" | "processing" | "complete" | "error";
  created_at: string;
  title?: string;
  completed_at?: string;
  error_message?: string;
  input: InvestigationInputDetail;
  findings?: LensFindingsMap;
}

// ── Auth / User ───────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ── API errors ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ContextLensFindings {
  claim_topic: string;
  entities: string[];
  temporal_context: string;
  geographic_context: string;
  missing_context: string;
  misleading_wording_analysis: string;
  background_facts: string[];
  context_established: boolean;
}

export interface ReasoningPattern {
  pattern_type: string;
  description: string;
  potential_issue: string;
}

export interface AILensFindings {
  reasoning_patterns: ReasoningPattern[];
}

export interface ThinkingQuestion {
  question_text: string;
  category: "source" | "evidence" | "context" | "emotion" | "alternative explanation" | "uncertainty";
  rationale: string;
}

export interface ReplayStage {
  step: number;
  title: string;
  description: string;
  status: "pending" | "processing" | "complete" | "skipped";
}

export interface ReminderItem {
  type: "success" | "warning" | "info";
  text: string;
}

export interface ReflectionResponse {
  session_id: string;
  initial_reaction?: string;
  post_analysis_reaction?: string;
  what_changed?: string;
  share_decision?: string;
  created_at: string;
  updated_at: string;
}

export interface ThinkingResponse {
  session_id: string;
  context?: ContextLensFindings;
  ai_lens?: AILensFindings;
  thinking_questions: ThinkingQuestion[];
  thinking_replay: ReplayStage[];
  reminders: ReminderItem[];
  reflection?: ReflectionResponse;
}

