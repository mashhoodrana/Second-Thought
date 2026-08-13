from typing import TypedDict, Optional, Annotated
from langgraph.graph import StateGraph, START, END

from app.models.findings import (
    SourceLensFindings,
    EmotionLensFindings,
    EvidenceLensFindings,
    SynthesisFindings,
    ContextLensFindings,
    AILensFindings,
    ThinkingQuestionsFindings
)
from app.core.langgraph.lenses.source_lens import run_source_lens
from app.core.langgraph.lenses.emotion_lens import run_emotion_lens
from app.core.langgraph.lenses.evidence_lens import run_evidence_lens
from app.core.langgraph.nodes.synthesis import run_synthesis
from app.core.langgraph.lenses.context_lens import run_context_lens
from app.core.langgraph.lenses.ai_lens import run_ai_lens
from app.core.langgraph.nodes.thinking_questions import run_thinking_questions

def merge_errors(existing: dict, new_val: dict) -> dict:
    """Reducer to merge error dictionaries from parallel branches."""
    if existing is None:
        existing = {}
    return {**existing, **new_val}

class InvestigationState(TypedDict):
    original_input: str
    sanitized_input: str
    source_findings: Optional[SourceLensFindings]
    emotion_findings: Optional[EmotionLensFindings]
    evidence_findings: Optional[EvidenceLensFindings]
    synthesis: Optional[SynthesisFindings]
    context_findings: Optional[ContextLensFindings]
    ai_findings: Optional[AILensFindings]
    thinking_questions: Optional[ThinkingQuestionsFindings]
    errors: Annotated[dict, merge_errors]

def create_investigation_graph():
    """
    Builds and compiles the LangGraph StateGraph.
    
    Execution flow:
    START -> evidence_lens (performs search and query optimization)
          -> branches in parallel to source_lens and emotion_lens
          -> joins parallel branches at synthesis node
          -> branches in parallel to context_lens and ai_lens
          -> joins at thinking_questions node
          -> END
    """
    workflow = StateGraph(InvestigationState)
    
    # Register nodes
    workflow.add_node("evidence", run_evidence_lens)
    workflow.add_node("source", run_source_lens)
    workflow.add_node("emotion", run_emotion_lens)
    workflow.add_node("synthesis", run_synthesis)
    workflow.add_node("context", run_context_lens)
    workflow.add_node("ai", run_ai_lens)
    workflow.add_node("thinking_questions", run_thinking_questions)
    
    # Establish edges
    # 1. Start with evidence search and emotion analysis in parallel
    workflow.add_edge(START, "evidence")
    workflow.add_edge(START, "emotion")
    
    # 2. Fan-out from evidence to source, context, and ai lenses in parallel
    workflow.add_edge("evidence", "source")
    workflow.add_edge("evidence", "context")
    workflow.add_edge("evidence", "ai")
    
    # 3. Synthesis runs once source evaluation and emotion pressure analysis complete
    workflow.add_edge("source", "synthesis")
    workflow.add_edge("emotion", "synthesis")
    
    # 4. Thinking questions runs once synthesis, context, and AI analysis all complete
    workflow.add_edge("synthesis", "thinking_questions")
    workflow.add_edge("context", "thinking_questions")
    workflow.add_edge("ai", "thinking_questions")
    
    # 5. Finish
    workflow.add_edge("thinking_questions", END)
    
    return workflow.compile()

