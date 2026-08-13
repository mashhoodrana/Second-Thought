"""
Second Thought Backend — Investigations router
POST /investigations — protected, launches graph in BackgroundTasks.
GET /investigations — list past sessions.
GET /investigations/{session_id} — get session status, inputs, and lens findings.
"""
from datetime import datetime, timezone
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, status, BackgroundTasks

from app.core.config import Settings, get_settings
from app.core.database import get_user_db_client
from app.core.security import UserContext, get_current_user
from app.models.investigation import (
    InvestigationCreate,
    InvestigationResponse,
    InvestigationDetailResponse,
    InvestigationInputModel,
    ReplayStage,
    ReminderItem,
    ReflectionSubmit,
    ReflectionResponseModel,
    ShareDecisionSubmit,
    ShareDecisionResponse,
    ThinkingResponse
)
from app.models.findings import (
    ContextLensFindings,
    AILensFindings,
    ThinkingQuestion
)
from app.core.services.processing import InvestigationProcessingService

router = APIRouter(prefix="/investigations", tags=["investigations"])


def _extract_token(request: Request) -> str:
    """Re-extract the raw Bearer token for use with the DB client."""
    auth_header = request.headers.get("Authorization", "")
    return auth_header.removeprefix("Bearer ").strip()


@router.post("", status_code=status.HTTP_201_CREATED, response_model=InvestigationResponse)
async def create_investigation(
    request: Request,
    body: InvestigationCreate,
    background_tasks: BackgroundTasks,
    current_user: UserContext = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> InvestigationResponse:
    """
    Submit content for investigation.

    Phase 2: creates the session (status: pending) and input records,
    then launches the LangGraph engine asynchronously.
    """
    token = _extract_token(request)
    db = get_user_db_client(token, settings)
    user_id = str(current_user.user_id)

    # Deterministically truncate claim to first 70 characters for navigation title
    raw_text_clean = body.raw_text.strip()
    if not raw_text_clean:
        title = "Untitled Investigation"
    else:
        first_line = raw_text_clean.split("\n")[0].strip()
        if len(first_line) > 70:
            title = first_line[:67].strip() + "..."
        else:
            title = first_line

    # 1. Create investigation session (status: pending)
    try:
        session_result = (
            db.table("investigation_sessions")
            .insert({"user_id": user_id, "status": "pending", "title": title})
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create investigation session",
        ) from exc

    if not session_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Investigation session creation returned no data",
        )

    session = session_result.data[0]
    session_id = session["id"]

    # 2. Create investigation input
    try:
        db.table("investigation_inputs").insert(
            {
                "session_id": session_id,
                "content_type": body.content_type,
                "raw_text": body.raw_text.strip(),
            }
        ).execute()
    except Exception as exc:
        try:
            db.table("investigation_sessions").update({"status": "error"}).eq(
                "id", session_id
            ).execute()
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store investigation input",
        ) from exc

    # 3. Queue processing task asynchronously
    background_tasks.add_task(
        InvestigationProcessingService.process_investigation,
        UUID(session_id),
        body.raw_text,
        token
    )

    return InvestigationResponse(
        session_id=session_id,
        status="pending",
        created_at=session["created_at"],
        title=title
    )


@router.get("", response_model=List[InvestigationResponse])
async def list_investigations(
    request: Request,
    current_user: UserContext = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> List[InvestigationResponse]:
    """
    List user's past session metadata and status.
    """
    token = _extract_token(request)
    db = get_user_db_client(token, settings)
    
    try:
        result = (
            db.table("investigation_sessions")
            .select("id, status, created_at, title")
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve investigations list",
        ) from exc
        
    sessions = []
    for row in result.data:
        sessions.append(InvestigationResponse(
            session_id=row["id"],
            status=row["status"],
            created_at=row["created_at"],
            title=row.get("title") or "Untitled Investigation"
        ))
        
    return sessions


@router.get("/{session_id}", response_model=InvestigationDetailResponse)
async def get_investigation(
    session_id: UUID,
    request: Request,
    current_user: UserContext = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> InvestigationDetailResponse:
    """
    Retrieves session details, inputs, and all computed findings.
    """
    token = _extract_token(request)
    db = get_user_db_client(token, settings)
    session_id_str = str(session_id)
    
    # 1. Retrieve session metadata
    try:
        session_res = (
            db.table("investigation_sessions")
            .select("id, status, created_at, completed_at, error_message, title")
            .eq("id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session metadata",
        ) from exc
        
    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation session not found",
        )
        
    session = session_res.data[0]
    
    # 2. Retrieve session input
    try:
        input_res = (
            db.table("investigation_inputs")
            .select("content_type, raw_text, sanitized_text")
            .eq("session_id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session input",
        ) from exc
        
    input_data = None
    if input_res.data:
        row = input_res.data[0]
        input_data = InvestigationInputModel(
            content_type=row["content_type"],
            raw_text=row["raw_text"],
            sanitized_text=row.get("sanitized_text")
        )
        
    # 3. Retrieve computed findings
    try:
        findings_res = (
            db.table("lens_findings")
            .select("lens_type, findings")
            .eq("session_id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve lens findings",
        ) from exc
        
    findings_map = {}
    for row in findings_res.data:
        findings_map[row["lens_type"]] = row["findings"]
        
    return InvestigationDetailResponse(
        session_id=session["id"],
        status=session["status"],
        created_at=session["created_at"],
        title=session.get("title") or "Untitled Investigation",
        completed_at=session.get("completed_at"),
        error_message=session.get("error_message"),
        input=input_data,
        findings=findings_map if findings_map else None
    )


@router.get("/{session_id}/thinking", response_model=ThinkingResponse)
async def get_thinking_data(
    session_id: UUID,
    request: Request,
    current_user: UserContext = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> ThinkingResponse:
    """
    Retrieve Phase 3 critical thinking data including Context Lens, AI Lens,
    Thinking Questions, Replay stages, reminders, and user reflection responses.
    """
    token = _extract_token(request)
    db = get_user_db_client(token, settings)
    session_id_str = str(session_id)

    # 1. Verify session exists and is owned by the user (RLS will filter out if not owned)
    try:
        session_res = (
            db.table("investigation_sessions")
            .select("id, status, created_at")
            .eq("id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session metadata",
        ) from exc

    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation session not found",
        )

    session_row = session_res.data[0]
    session_status = session_row["status"]

    # 2. Query lens findings (context and ai)
    context_findings = None
    ai_lens_findings = None
    source_findings = None
    emotion_findings = None
    evidence_findings = None
    synthesis_findings = None

    try:
        findings_res = (
            db.table("lens_findings")
            .select("lens_type, findings")
            .eq("session_id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve lens findings",
        ) from exc

    for row in findings_res.data:
        ltype = row["lens_type"]
        if ltype == "context":
            context_findings = ContextLensFindings.model_validate(row["findings"])
        elif ltype == "ai":
            ai_lens_findings = AILensFindings.model_validate(row["findings"])
        elif ltype == "source":
            source_findings = row["findings"]
        elif ltype == "emotion":
            emotion_findings = row["findings"]
        elif ltype == "evidence":
            evidence_findings = row["findings"]
        elif ltype == "synthesis":
            synthesis_findings = row["findings"]

    # 3. Query thinking questions
    try:
        questions_res = (
            db.table("thinking_questions")
            .select("question_text, category, rationale")
            .eq("session_id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve thinking questions",
        ) from exc

    thinking_questions = []
    for row in questions_res.data:
        thinking_questions.append(
            ThinkingQuestion(
                question_text=row["question_text"],
                category=row["category"],
                rationale=row["rationale"]
            )
        )

    # 4. Query reflection responses
    try:
        reflection_res = (
            db.table("reflection_responses")
            .select("session_id, initial_reaction, post_analysis_reaction, what_changed, share_decision, created_at, updated_at")
            .eq("session_id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve reflection responses",
        ) from exc

    reflection = None
    if reflection_res.data:
        row = reflection_res.data[0]
        reflection = ReflectionResponseModel(
            session_id=UUID(row["session_id"]),
            initial_reaction=row.get("initial_reaction"),
            post_analysis_reaction=row.get("post_analysis_reaction"),
            what_changed=row.get("what_changed"),
            share_decision=row.get("share_decision"),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"])
        )

    # 5. Generate personalized reminders
    reminders = []
    if session_status == "complete":
        # Source Reminders
        if source_findings and "domains" in source_findings:
            domains = source_findings["domains"]
            if any(d.get("reputation_score", 1.0) < 0.6 for d in domains):
                reminders.append(ReminderItem(type="warning", text="One or more sources have weaker credibility signals."))
            else:
                reminders.append(ReminderItem(type="success", text="The sources retrieved are generally reputable."))
        # Emotion Reminders
        if emotion_findings:
            sensationalism = emotion_findings.get("sensationalism_score", 0.0)
            if sensationalism > 0.5:
                reminders.append(ReminderItem(type="warning", text="The claim's wording contains strong emotional framing."))
            else:
                reminders.append(ReminderItem(type="success", text="Minimal sensationalism or emotional framing detected."))
        # Evidence Reminders
        if evidence_findings:
            claims_list = evidence_findings.get("claims", [])
            has_corroborates = any(c.get("relationship") == "corroborates" for c in claims_list)
            has_contradicts = any(c.get("relationship") == "contradicts" for c in claims_list)
            if has_contradicts:
                reminders.append(ReminderItem(type="warning", text="Some retrieved sources conflict with the claim."))
            elif has_corroborates:
                reminders.append(ReminderItem(type="success", text="We found supporting evidence in the sources."))
            else:
                reminders.append(ReminderItem(type="info", text="No direct supporting evidence was found."))
        # Context Reminders
        if context_findings:
            if context_findings.context_established:
                reminders.append(ReminderItem(type="success", text="Context could be successfully established."))
            else:
                reminders.append(ReminderItem(type="warning", text="Important context remains uncertain or unavailable."))

    # 6. Generate thinking replay
    stages = [
        ("Claim received", "Your claim was safely received by Second Thought."),
        ("Personal information scrubbed", "Emails and phone numbers were removed to protect your privacy."),
        ("Evidence searched", "Optimized queries were run on search engines to fetch news and reports."),
        ("Sources compared", "Information from different publishers was collected and compared."),
        ("Source credibility signals examined", "Publisher reputations and editorial signals were evaluated."),
        ("Emotional pressure signals examined", "Wording was analyzed for sensationalist tones and urgency cues."),
        ("Context examined", "Temporal, geographic, and background context was established."),
        ("Reasoning patterns identified", "Underlying causal claims, assumptions, and comparisons were analyzed."),
        ("Findings synthesized", "Lens outputs were compiled into an objective educational summary."),
        ("Remaining uncertainty identified", "Unverified claims and conflicting information were mapped out."),
    ]

    thinking_replay = []
    for idx, (title, desc) in enumerate(stages):
        step_num = idx + 1
        status_val = "pending"
        
        if session_status == "complete":
            status_val = "complete"
        elif session_status == "error":
            status_val = "skipped"
        elif session_status == "processing":
            # Map stages based on existing findings
            if step_num == 1 or step_num == 2:
                status_val = "complete"
            elif step_num == 3:
                status_val = "complete" if evidence_findings else "processing"
            elif step_num == 4:
                status_val = "complete" if evidence_findings else "pending"
            elif step_num == 5:
                status_val = "complete" if source_findings else "pending"
            elif step_num == 6:
                status_val = "complete" if emotion_findings else "pending"
            elif step_num == 7:
                status_val = "complete" if context_findings else "pending"
            elif step_num == 8:
                status_val = "complete" if ai_lens_findings else "pending"
            elif step_num == 9 or step_num == 10:
                status_val = "complete" if synthesis_findings else "pending"
        
        thinking_replay.append(
            ReplayStage(
                step=step_num,
                title=title,
                description=desc,
                status=status_val
            )
        )

    return ThinkingResponse(
        session_id=session_id,
        context=context_findings,
        ai_lens=ai_lens_findings,
        thinking_questions=thinking_questions,
        thinking_replay=thinking_replay,
        reminders=reminders,
        reflection=reflection
    )


@router.post("/{session_id}/reflection", response_model=ReflectionResponseModel)
async def post_reflection(
    session_id: UUID,
    body: ReflectionSubmit,
    request: Request,
    current_user: UserContext = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> ReflectionResponseModel:
    """
    Submit user reflection responses, including initial reaction,
    post-analysis reaction, and what changed their thinking.
    """
    token = _extract_token(request)
    db = get_user_db_client(token, settings)
    session_id_str = str(session_id)

    # 1. Verify session exists and is owned by the user
    try:
        session_res = (
            db.table("investigation_sessions")
            .select("id")
            .eq("id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session metadata",
        ) from exc

    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation session not found",
        )

    # 2. Upsert reflection response
    now_str = datetime.now(timezone.utc).isoformat()
    reflection_data = {
        "session_id": session_id_str,
        "updated_at": now_str
    }
    if body.initial_reaction is not None:
        reflection_data["initial_reaction"] = body.initial_reaction
    if body.post_analysis_reaction is not None:
        reflection_data["post_analysis_reaction"] = body.post_analysis_reaction
    if body.what_changed is not None:
        reflection_data["what_changed"] = body.what_changed

    try:
        upsert_res = (
            db.table("reflection_responses")
            .upsert(reflection_data)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save reflection response: {str(exc)}",
        ) from exc

    if not upsert_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Upsert returned empty data",
        )

    row = upsert_res.data[0]
    return ReflectionResponseModel(
        session_id=UUID(row["session_id"]),
        initial_reaction=row.get("initial_reaction"),
        post_analysis_reaction=row.get("post_analysis_reaction"),
        what_changed=row.get("what_changed"),
        share_decision=row.get("share_decision"),
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"])
    )


@router.post("/{session_id}/share-decision", response_model=ShareDecisionResponse)
async def post_share_decision(
    session_id: UUID,
    body: ShareDecisionSubmit,
    request: Request,
    current_user: UserContext = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> ShareDecisionResponse:
    """
    Submit user's final share-readiness decision.
    """
    token = _extract_token(request)
    db = get_user_db_client(token, settings)
    session_id_str = str(session_id)

    # 1. Verify session exists and is owned by the user
    try:
        session_res = (
            db.table("investigation_sessions")
            .select("id")
            .eq("id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session metadata",
        ) from exc

    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation session not found",
        )

    # 2. Upsert share decision
    now_str = datetime.now(timezone.utc).isoformat()
    reflection_data = {
        "session_id": session_id_str,
        "share_decision": body.share_decision,
        "updated_at": now_str
    }

    try:
        upsert_res = (
            db.table("reflection_responses")
            .upsert(reflection_data)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save share decision: {str(exc)}",
        ) from exc

    if not upsert_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Upsert returned empty data",
        )

    row = upsert_res.data[0]
    return ShareDecisionResponse(
        session_id=UUID(row["session_id"]),
        share_decision=row["share_decision"],
        updated_at=datetime.fromisoformat(row["updated_at"])
    )


@router.post("/{session_id}/retry", response_model=InvestigationResponse)
async def retry_investigation(
    session_id: UUID,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: UserContext = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> InvestigationResponse:
    """
    Retry a failed or stalled investigation.
    """
    token = _extract_token(request)
    db = get_user_db_client(token, settings)
    session_id_str = str(session_id)

    # 1. Retrieve session metadata to ensure ownership (via RLS)
    try:
        session_res = (
            db.table("investigation_sessions")
            .select("id, status, created_at, title")
            .eq("id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session metadata",
        ) from exc

    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation session not found",
        )

    session = session_res.data[0]

    # 2. Retrieve session input text to process
    try:
        input_res = (
            db.table("investigation_inputs")
            .select("raw_text")
            .eq("session_id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session input",
        ) from exc

    if not input_res.data or not input_res.data[0].get("raw_text"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Investigation input raw text not found",
        )

    raw_text = input_res.data[0]["raw_text"]

    # 3. Clean up existing findings/questions and reset status
    try:
        # Delete previous questions
        try:
            db.table("thinking_questions").delete().eq("session_id", session_id_str).execute()
        except Exception:
            pass

        # Delete previous findings
        try:
            db.table("lens_findings").delete().eq("session_id", session_id_str).execute()
        except Exception:
            pass

        db.table("investigation_sessions").update({
            "status": "pending",
            "error_message": None,
            "completed_at": None
        }).eq("id", session_id_str).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset session status",
        ) from exc

    # 4. Queue the task asynchronously
    background_tasks.add_task(
        InvestigationProcessingService.process_investigation,
        UUID(session_id_str),
        raw_text,
        token
    )

    return InvestigationResponse(
        session_id=session["id"],
        status="pending",
        created_at=session["created_at"],
        title=session.get("title") or "Untitled Investigation"
    )


@router.delete("/{session_id}", status_code=status.HTTP_200_OK)
async def delete_investigation(
    session_id: UUID,
    request: Request,
    current_user: UserContext = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """
    Delete an investigation session owned by the current user.
    """
    token = _extract_token(request)
    db = get_user_db_client(token, settings)
    session_id_str = str(session_id)

    # 1. Verify session exists
    try:
        session_res = (
            db.table("investigation_sessions")
            .select("id")
            .eq("id", session_id_str)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session details",
        ) from exc

    if not session_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investigation session not found",
        )

    # 2. Perform the deletion
    try:
        db.table("investigation_sessions").delete().eq("id", session_id_str).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete investigation session: {str(exc)}",
        ) from exc

    return {"status": "success", "message": "Investigation deleted."}



