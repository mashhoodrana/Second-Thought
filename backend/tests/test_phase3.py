import pytest
from uuid import uuid4, UUID
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.core.providers.mock_providers import MockLLMProvider, MockSearchProvider
from app.core.langgraph.graph import create_investigation_graph
from app.models.findings import (
    ContextLensFindings,
    AILensFindings,
    ThinkingQuestionsFindings
)
from tests.conftest import TEST_USER_ID, FAKE_TOKEN

# ── LangGraph Execution Tests ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_langgraph_phase3_nodes():
    graph = create_investigation_graph()
    initial_state = {
        "original_input": "Is BBC reporting that global temperatures broke records in 2026?",
        "sanitized_input": "Is BBC reporting that global temperatures broke records in 2026?",
        "source_findings": None,
        "emotion_findings": None,
        "evidence_findings": None,
        "synthesis": None,
        "context_findings": None,
        "ai_findings": None,
        "thinking_questions": None,
        "errors": {}
    }
    
    config = {
        "configurable": {
            "llm": MockLLMProvider(),
            "search": MockSearchProvider()
        }
    }
    
    result = await graph.ainvoke(initial_state, config=config)
    
    assert result is not None
    assert isinstance(result["context_findings"], ContextLensFindings)
    assert isinstance(result["ai_findings"], AILensFindings)
    assert isinstance(result["thinking_questions"], ThinkingQuestionsFindings)
    
    # 1. Context Lens assertions
    context = result["context_findings"]
    assert context.claim_topic != ""
    assert isinstance(context.entities, list)
    assert context.context_established is True
    
    # 2. AI Lens assertions (no automatic true/false verdict, calibrated language)
    ai = result["ai_findings"]
    assert len(ai.reasoning_patterns) > 0
    for pattern in ai.reasoning_patterns:
        assert "false" not in pattern.potential_issue.lower()
        assert "fake" not in pattern.potential_issue.lower()
        
    # 3. Thinking Questions assertions (3-5 questions)
    tq = result["thinking_questions"]
    assert 3 <= len(tq.questions) <= 5
    for q in tq.questions:
        assert q.question_text != ""
        assert q.category in ["source", "evidence", "context", "emotion", "alternative explanation", "uncertainty"]


# ── API Endpoints Tests ──────────────────────────────────────────────────

FAKE_SESSION_ID = str(uuid4())

def make_mock_db_phase3():
    mock_db = MagicMock()
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    
    # Mock for SELECT investigation_sessions
    session_select_res = MagicMock()
    session_select_res.data = [{
        "id": FAKE_SESSION_ID,
        "user_id": str(TEST_USER_ID),
        "status": "complete",
        "created_at": "2026-08-11T12:00:00+00:00"
    }]
    
    # Mock for SELECT lens_findings
    findings_select_res = MagicMock()
    findings_select_res.data = [
        {
            "lens_type": "context",
            "findings": {
                "claim_topic": "Global temperature",
                "entities": ["BBC"],
                "temporal_context": "2026",
                "geographic_context": "global",
                "missing_context": "None",
                "misleading_wording_analysis": "None",
                "background_facts": ["BBC published temperature data [src_001]"],
                "context_established": True
            }
        },
        {
            "lens_type": "ai",
            "findings": {
                "reasoning_patterns": [
                    {
                        "pattern_type": "correlation vs causation",
                        "description": "Explains that correlation does not mean causation.",
                        "potential_issue": "The claim assumes causation."
                    }
                ]
            }
        },
        {
            "lens_type": "source",
            "findings": {
                "domains": [
                    {
                        "domain": "bbc.co.uk",
                        "reputation_score": 0.95,
                        "reliability_signals": ["established_news"]
                    }
                ]
            }
        },
        {
            "lens_type": "emotion",
            "findings": {
                "sentiment": "neutral",
                "emotional_tone": ["calm"],
                "sensationalism_score": 0.1,
                "emotional_pressure_signals": [],
                "manipulative_language_detected": False
            }
        },
        {
            "lens_type": "evidence",
            "findings": {
                "search_queries_generated": ["global temperatures 2026"],
                "claims": [
                    {
                        "claim_text": "Global temperatures broke records.",
                        "citation_source_id": "src_001",
                        "relationship": "corroborates"
                    }
                ],
                "sources": [
                    {
                        "source_id": "src_001",
                        "url": "https://bbc.co.uk/news/123",
                        "title": "Temperature Records",
                        "publisher": "bbc.co.uk",
                        "retrieved_at": "2026-08-11T12:00:00Z",
                        "snippet": "BBC reports record global temperatures."
                    }
                ]
            }
        }
    ]
    
    # Mock for SELECT thinking_questions
    questions_select_res = MagicMock()
    questions_select_res.data = [
        {
            "question_text": "Who is the original source?",
            "category": "source",
            "rationale": "Verify source credibility."
        },
        {
            "question_text": "Is the wording emotional?",
            "category": "emotion",
            "rationale": "Verify sensationalism."
        },
        {
            "question_text": "What context is missing?",
            "category": "context",
            "rationale": "Check background facts."
        }
    ]
    
    # Mock for SELECT reflection_responses
    reflection_select_res = MagicMock()
    reflection_select_res.data = [{
        "session_id": FAKE_SESSION_ID,
        "initial_reaction": "believe",
        "post_analysis_reaction": "more_confident",
        "what_changed": "The sources are credible.",
        "share_decision": "share_with_context",
        "created_at": "2026-08-11T12:00:00+00:00",
        "updated_at": "2026-08-11T12:05:00+00:00"
    }]
    
    # Configure mock chain returns
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    
    # We use side_effect on mock_eq.execute to return the correct select results in order of queries:
    # 1. session metadata select
    # 2. lens findings select
    # 3. thinking questions select
    # 4. reflection responses select
    mock_eq.execute.side_effect = [
        session_select_res,
        findings_select_res,
        questions_select_res,
        reflection_select_res
    ]
    
    return mock_db

def test_get_thinking_data_success(authenticated_client: TestClient) -> None:
    with patch("app.routers.investigations.get_user_db_client") as mock_get_db:
        mock_get_db.return_value = make_mock_db_phase3()
        
        response = authenticated_client.get(
            f"/investigations/{FAKE_SESSION_ID}/thinking",
            headers={"Authorization": "Bearer fake.token"}
        )
        
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == FAKE_SESSION_ID
    assert data["context"]["claim_topic"] == "Global temperature"
    assert data["ai_lens"]["reasoning_patterns"][0]["pattern_type"] == "correlation vs causation"
    assert len(data["thinking_questions"]) == 3
    assert len(data["thinking_replay"]) == 10
    
    # Verify thinking replay step statuses
    for step in data["thinking_replay"]:
        assert step["status"] == "complete"
        
    # Verify reminders are generated
    assert len(data["reminders"]) == 4
    reminders_texts = [r["text"] for r in data["reminders"]]
    assert "The sources retrieved are generally reputable." in reminders_texts
    assert "Minimal sensationalism or emotional framing detected." in reminders_texts
    assert "We found supporting evidence in the sources." in reminders_texts
    assert "Context could be successfully established." in reminders_texts


def test_post_reflection_success(authenticated_client: TestClient) -> None:
    mock_db = MagicMock()
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    
    # 1. session check
    session_res = MagicMock()
    session_res.data = [{"id": FAKE_SESSION_ID}]
    
    # 2. upsert reflection response
    upsert_res = MagicMock()
    upsert_res.data = [{
        "session_id": FAKE_SESSION_ID,
        "initial_reaction": "believe",
        "post_analysis_reaction": "more_confident",
        "what_changed": "Evidence grounds it.",
        "share_decision": None,
        "created_at": "2026-08-11T12:00:00+00:00",
        "updated_at": "2026-08-11T12:10:00+00:00"
    }]
    
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    mock_eq.execute.return_value = session_res
    
    mock_upsert = MagicMock()
    mock_table.upsert.return_value = mock_upsert
    mock_upsert.execute.return_value = upsert_res
    
    with patch("app.routers.investigations.get_user_db_client") as mock_get_db:
        mock_get_db.return_value = mock_db
        
        response = authenticated_client.post(
            f"/investigations/{FAKE_SESSION_ID}/reflection",
            json={
                "initial_reaction": "believe",
                "post_analysis_reaction": "more_confident",
                "what_changed": "Evidence grounds it."
            },
            headers={"Authorization": "Bearer fake.token"}
        )
        
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == FAKE_SESSION_ID
    assert data["initial_reaction"] == "believe"
    assert data["post_analysis_reaction"] == "more_confident"
    assert data["what_changed"] == "Evidence grounds it."


def test_post_share_decision_success(authenticated_client: TestClient) -> None:
    mock_db = MagicMock()
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    
    # 1. session check
    session_res = MagicMock()
    session_res.data = [{"id": FAKE_SESSION_ID}]
    
    # 2. upsert share decision
    upsert_res = MagicMock()
    upsert_res.data = [{
        "session_id": FAKE_SESSION_ID,
        "share_decision": "wait_and_verify",
        "updated_at": "2026-08-11T12:15:00+00:00"
    }]
    
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    mock_eq.execute.return_value = session_res
    
    mock_upsert = MagicMock()
    mock_table.upsert.return_value = mock_upsert
    mock_upsert.execute.return_value = upsert_res
    
    with patch("app.routers.investigations.get_user_db_client") as mock_get_db:
        mock_get_db.return_value = mock_db
        
        response = authenticated_client.post(
            f"/investigations/{FAKE_SESSION_ID}/share-decision",
            json={
                "share_decision": "wait_and_verify"
            },
            headers={"Authorization": "Bearer fake.token"}
        )
        
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == FAKE_SESSION_ID
    assert data["share_decision"] == "wait_and_verify"


def test_invalid_session_rejected(authenticated_client: TestClient) -> None:
    mock_db = MagicMock()
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    
    session_res = MagicMock()
    session_res.data = [] # Empty means session not found or not owned
    
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    mock_eq.execute.return_value = session_res
    
    with patch("app.routers.investigations.get_user_db_client") as mock_get_db:
        mock_get_db.return_value = mock_db
        
        response = authenticated_client.get(
            f"/investigations/{uuid4()}/thinking",
            headers={"Authorization": "Bearer fake.token"}
        )
        
    assert response.status_code == 404
    assert response.json()["detail"] == "Investigation session not found"


@pytest.mark.parametrize(
    "decision",
    ["wait_and_verify", "share_with_context", "not_share", "still_unsure"]
)
def test_post_share_decision_all_options(authenticated_client: TestClient, decision: str) -> None:
    mock_db = MagicMock()
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    
    # 1. session check
    session_res = MagicMock()
    session_res.data = [{"id": FAKE_SESSION_ID}]
    
    # 2. upsert share decision
    upsert_res = MagicMock()
    upsert_res.data = [{
        "session_id": FAKE_SESSION_ID,
        "share_decision": decision,
        "updated_at": "2026-08-11T12:15:00+00:00"
    }]
    
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq = MagicMock()
    mock_select.eq.return_value = mock_eq
    mock_eq.execute.return_value = session_res
    
    mock_upsert = MagicMock()
    mock_table.upsert.return_value = mock_upsert
    mock_upsert.execute.return_value = upsert_res
    
    with patch("app.routers.investigations.get_user_db_client") as mock_get_db:
        mock_get_db.return_value = mock_db
        
        response = authenticated_client.post(
            f"/investigations/{FAKE_SESSION_ID}/share-decision",
            json={
                "share_decision": decision
            },
            headers={"Authorization": "Bearer fake.token"}
        )
        
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == FAKE_SESSION_ID
    assert data["share_decision"] == decision


def test_delete_investigation_success(authenticated_client: TestClient) -> None:
    mock_db = MagicMock()
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    
    # 1. session check
    session_res = MagicMock()
    session_res.data = [{"id": FAKE_SESSION_ID}]
    
    # 2. delete execution
    delete_res = MagicMock()
    delete_res.data = [{"id": FAKE_SESSION_ID}]
    
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq_select = MagicMock()
    mock_select.eq.return_value = mock_eq_select
    mock_eq_select.execute.return_value = session_res
    
    mock_delete = MagicMock()
    mock_table.delete.return_value = mock_delete
    mock_eq_delete = MagicMock()
    mock_delete.eq.return_value = mock_eq_delete
    mock_eq_delete.execute.return_value = delete_res
    
    with patch("app.routers.investigations.get_user_db_client") as mock_get_db:
        mock_get_db.return_value = mock_db
        
        response = authenticated_client.delete(
            f"/investigations/{FAKE_SESSION_ID}",
            headers={"Authorization": "Bearer fake.token"}
        )
        
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["message"] == "Investigation deleted."


def test_delete_investigation_not_found(authenticated_client: TestClient) -> None:
    mock_db = MagicMock()
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table
    
    # Session not found check
    session_res = MagicMock()
    session_res.data = []
    
    mock_select = MagicMock()
    mock_table.select.return_value = mock_select
    mock_eq_select = MagicMock()
    mock_select.eq.return_value = mock_eq_select
    mock_eq_select.execute.return_value = session_res
    
    with patch("app.routers.investigations.get_user_db_client") as mock_get_db:
        mock_get_db.return_value = mock_db
        
        response = authenticated_client.delete(
            f"/investigations/{FAKE_SESSION_ID}",
            headers={"Authorization": "Bearer fake.token"}
        )
        
    assert response.status_code == 404
    assert response.json()["detail"] == "Investigation session not found"

