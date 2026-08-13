from langchain_core.runnables import RunnableConfig
from app.models.findings import AILensFindings
from app.core.protocols import LLMProvider

async def run_ai_lens(state: dict, config: RunnableConfig) -> dict:
    """
    Executes the AI Lens.
    Examines the claim for reasoning patterns, unsupported assumptions, misleading framing,
    or cognitive traps. It teaches the user what to inspect rather than declaring truth values.
    """
    llm: LLMProvider = config.get("configurable", {}).get("llm")
    if not llm:
        return {"errors": {"ai": "LLM provider not configured"}}

    sanitized_input = state.get("sanitized_input", "")
    evidence_findings = state.get("evidence_findings")

    # Format the evidence findings text for the model
    evidence_text = "No search evidence retrieved."
    if evidence_findings and evidence_findings.sources:
        evidence_text = "Retrieved sources:\n"
        for s in evidence_findings.sources:
            evidence_text += f"- {s.source_id}: snippet='{s.snippet}'\n"
        evidence_text += "\nExtracted claims:\n"
        for c in evidence_findings.claims:
            evidence_text += f"- Claim: '{c.claim_text}' (Source: {c.citation_source_id}, Relationship: {c.relationship})\n"

    prompt = f"""
    You are Second Thought's AI Lens, a reasoning-assistance utility.
    Your job is to examine the user's claim and identify reasoning patterns or cognitive framing issues that the user should look out for.

    User Claim: "{sanitized_input}"

    === Retrieved Search Evidence ===
    {evidence_text}

    Analyze the claim and identify 1 to 3 reasoning patterns that are present in the claim's text or its comparison to the evidence.
    Examples of patterns to check for:
    - missing evidence
    - unsupported assumptions
    - misleading framing
    - false certainty
    - cherry-picking possibility
    - correlation vs causation
    - appeal to emotion
    - false dilemma
    - incomplete comparison
    - loaded framing
    - ambiguity
    - extraordinary claim requiring stronger evidence

    CRITICAL RULES:
    1. DO NOT produce a "truth detector". Never label the claim as false or misinformation.
    2. Focus on teaching the user what to inspect. For instance, if causation is assumed from correlation, explain that they are distinct concepts and point to what sources actually show.
    3. Keep descriptions objective, educational, and easy to understand for young users. Avoid overly complex academic jargon.

    For each pattern:
    - pattern_type: The name of the pattern (e.g., 'correlation vs causation').
    - description: General educational explanation of this pattern.
    - potential_issue: Specific analysis of how it manifests in this claim based on the available evidence.
    """

    system_instruction = (
        "You are Second Thought's AI Lens. You are an educational tool that helps users identify "
        "reasoning patterns and cognitive traps. You must never declare a claim definitively true or false, "
        "nor label it as misinformation. Instead, explain the reasoning pattern and what details to check."
    )

    try:
        findings = await llm.generate_json(
            prompt=prompt,
            schema=AILensFindings,
            system_instruction=system_instruction
        )
        
        db = config.get("configurable", {}).get("db")
        session_id = config.get("configurable", {}).get("session_id")
        if db and session_id:
            try:
                import asyncio
                query = db.table("lens_findings").upsert({
                    "session_id": session_id,
                    "lens_type": "ai",
                    "findings": findings.model_dump()
                })
                await asyncio.to_thread(query.execute)
            except Exception:
                pass
                
        return {"ai_findings": findings}
    except Exception as e:
        return {"errors": {"ai": f"AI lens failed: {str(e)}"}}
