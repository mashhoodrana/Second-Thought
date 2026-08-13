from langchain_core.runnables import RunnableConfig
from app.models.findings import ThinkingQuestionsFindings
from app.core.protocols import LLMProvider

async def run_thinking_questions(state: dict, config: RunnableConfig) -> dict:
    """
    Executes the Thinking Questions node.
    Generates 3 to 5 highly relevant, investigation-grounded critical thinking questions
    across categories like source, evidence, context, emotion, alternative explanation, and uncertainty.
    """
    llm: LLMProvider = config.get("configurable", {}).get("llm")
    if not llm:
        return {"errors": {"thinking_questions": "LLM provider not configured"}}

    original_input = state.get("original_input", "")
    source_findings = state.get("source_findings")
    emotion_findings = state.get("emotion_findings")
    evidence_findings = state.get("evidence_findings")
    synthesis = state.get("synthesis")
    context_findings = state.get("context_findings")
    ai_findings = state.get("ai_findings")

    # Format findings summary for the model to generate grounded questions
    summary = f"""
    User Claim: "{original_input}"
    
    Source Lens Findings: {source_findings.model_dump() if source_findings else 'None'}
    Emotion Lens Findings: {emotion_findings.model_dump() if emotion_findings else 'None'}
    Evidence Lens Findings: {evidence_findings.model_dump() if evidence_findings else 'None'}
    Synthesis: {synthesis.model_dump() if synthesis else 'None'}
    Context Findings: {context_findings.model_dump() if context_findings else 'None'}
    AI Findings: {ai_findings.model_dump() if ai_findings else 'None'}
    """

    prompt = f"""
    You are Second Thought's Thinking Questions Node. Your job is to generate a small number of high-value, specific critical-thinking questions for the user based on the actual investigation findings.

    {summary}

    Generate 3 to 5 questions.
    Each question must be tailored to the actual results of the investigation:
    - Source: e.g. Who originally published this? Is the publisher reliable?
    - Evidence: e.g. What evidence actually supports this claim in the sources?
    - Context: e.g. What important information might be missing?
    - Emotion: e.g. Is the wording trying to make me react before verifying?
    - Alternative explanation: e.g. Is there another reasonable explanation for what we are seeing?
    - Uncertainty: e.g. What would we need to know before becoming more confident?

    CRITICAL RULES:
    1. Do NOT ask generic, placeholder, or filler questions. The questions must refer to the details found in this investigation.
    2. Only ask questions that are directly relevant (e.g. if there's no emotional pressure, don't focus a question on emotion; if there's a major causal assumption, ask about alternative explanations or uncertainty).
    3. Target exactly 3 to 5 questions in total.
    """

    system_instruction = (
        "You are Second Thought's Thinking Questions Node. Your purpose is to generate 3 to 5 highly relevant, "
        "grounded critical thinking questions based on the investigation findings to help users think critically."
    )

    try:
        findings = await llm.generate_json(
            prompt=prompt,
            schema=ThinkingQuestionsFindings,
            system_instruction=system_instruction
        )
        
        db = config.get("configurable", {}).get("db")
        session_id = config.get("configurable", {}).get("session_id")
        if db and session_id and findings.questions:
            try:
                questions_data = []
                for q in findings.questions:
                    questions_data.append({
                        "session_id": session_id,
                        "question_text": q.question_text,
                        "category": q.category,
                        "rationale": q.rationale
                    })
                import asyncio
                query = db.table("thinking_questions").insert(questions_data)
                await asyncio.to_thread(query.execute)
            except Exception:
                pass
                
        return {"thinking_questions": findings}
    except Exception as e:
        return {"errors": {"thinking_questions": f"Thinking questions generation failed: {str(e)}"}}
