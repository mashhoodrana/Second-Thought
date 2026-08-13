"""
Second Thought Backend — Pydantic models for investigations.
Phase 2 version containing detailed responses for retrieval.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, model_validator


class InvestigationCreate(BaseModel):
    """
    Request body for POST /investigations.
    """

    content_type: Literal["text", "image"]
    raw_text: str

    @model_validator(mode="after")
    def validate_content(self) -> "InvestigationCreate":
        if not self.raw_text or not self.raw_text.strip():
            raise ValueError("raw_text must not be empty")
        if self.content_type == "text" and len(self.raw_text) > 10_000:
            raise ValueError("raw_text must not exceed 10,000 characters")
        if self.content_type == "image" and len(self.raw_text) > 10_000_000:
            raise ValueError("image base64 data must not exceed 10MB")
        return self


class InvestigationResponse(BaseModel):
    """Response body returned after a successful investigation submission."""

    session_id: UUID
    status: str
    created_at: datetime
    title: Optional[str] = None


class InvestigationInputModel(BaseModel):
    content_type: str
    raw_text: str
    sanitized_text: Optional[str] = None


class InvestigationDetailResponse(BaseModel):
    session_id: UUID
    status: str
    created_at: datetime
    title: Optional[str] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    input: Optional[InvestigationInputModel] = None
    findings: Optional[Dict[str, Any]] = None

class ReplayStage(BaseModel):
    step: int
    title: str
    description: str
    status: Literal["pending", "processing", "complete", "skipped"]

class ReminderItem(BaseModel):
    type: Literal["success", "warning", "info"]
    text: str

class ReflectionSubmit(BaseModel):
    initial_reaction: Optional[Literal["believe", "doubt", "unsure", "share"]] = None
    post_analysis_reaction: Optional[Literal["more_confident", "less_confident", "still_unsure", "need_evidence"]] = None
    what_changed: Optional[str] = None

class ReflectionResponseModel(BaseModel):
    session_id: UUID
    initial_reaction: Optional[str] = None
    post_analysis_reaction: Optional[str] = None
    what_changed: Optional[str] = None
    share_decision: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ShareDecisionSubmit(BaseModel):
    share_decision: Literal["share_with_context", "wait_and_verify", "not_share", "still_unsure"]

class ShareDecisionResponse(BaseModel):
    session_id: UUID
    share_decision: str
    updated_at: datetime

from app.models.findings import ContextLensFindings, AILensFindings, ThinkingQuestion

class ThinkingResponse(BaseModel):
    session_id: UUID
    context: Optional[ContextLensFindings] = None
    ai_lens: Optional[AILensFindings] = None
    thinking_questions: List[ThinkingQuestion]
    thinking_replay: List[ReplayStage]
    reminders: List[ReminderItem]
    reflection: Optional[ReflectionResponseModel] = None

