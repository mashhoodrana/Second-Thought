from langchain_core.runnables import RunnableConfig
from app.models.findings import ContextLensFindings
from app.core.protocols import LLMProvider

async def run_context_lens(state: dict, config: RunnableConfig) -> dict:
    """
    Executes the Context Lens.
    Analyzes the claim's topic, entities, temporal/geographic context, missing context,
    misleading wording, and provides grounded background facts citing src_XXX source IDs.
    """
    llm: LLMProvider = config.get("configurable", {}).get("llm")
    if not llm:
        return {"errors": {"context": "LLM provider not configured"}}

    sanitized_input = state.get("sanitized_input", "")
    evidence_findings = state.get("evidence_findings")

    # Format the evidence findings text for the model
    evidence_text = "No search evidence retrieved."
    if evidence_findings and evidence_findings.sources:
        evidence_text = "Retrieved sources:\n"
        for s in evidence_findings.sources:
            evidence_text += f"- {s.source_id}: title='{s.title}', publisher='{s.publisher}', snippet='{s.snippet}'\n"
        evidence_text += "\nExtracted claims:\n"
        for c in evidence_findings.claims:
            evidence_text += f"- Claim: '{c.claim_text}' (Source: {c.citation_source_id}, Relationship: {c.relationship})\n"

    prompt = f"""
    You are Second Thought's Context Lens. Your job is to analyze the context surrounding the user's claim.

    User Claim: "{sanitized_input}"

    === Retrieved Search Evidence ===
    {evidence_text}

    Identify the following:
    1. claim_topic: What the claim is actually about.
    2. entities: Important entities involved (people, organizations, locations, etc.).
    3. temporal_context: Relevant time/date context if available, otherwise 'unknown'.
    4. geographic_context: Relevant geographic context if available, otherwise 'unknown'.
    5. missing_context: Any context that is missing or could make the claim misleading without it. If none, return 'None'.
    6. misleading_wording_analysis: Analysis of whether the wording of the claim is misleading without additional context.
    7. background_facts: List of important background facts needed to interpret the claim correctly.
       - CRITICAL: Each background fact must be strictly evidence-grounded. Do not invent any information.
       - Whenever a statement depends on the retrieved search evidence, you MUST cite the correct source ID (e.g., [src_001], [src_002]).
       - If a background fact cannot be verified or established from the evidence, do not list it.
    8. context_established: Boolean flag. Set to false if there is unknown/insufficient evidence to establish reliable context. Set to true if context could be established.

    Strictly ground your analysis in the retrieved search evidence. If no sources were retrieved or evidence is insufficient, set context_established to false, set temporal_context and geographic_context to 'unknown', and return 'insufficient evidence' or an empty list for background_facts. Do not hallucinate any information or source IDs.
    """

    system_instruction = (
        "You are Second Thought's Context Lens. Your purpose is to provide objective context "
        "and background facts for the user's claim based on search evidence. "
        "You must cite source IDs (e.g. [src_001]) for any statements depending on retrieved evidence. "
        "Do not invent information or cite sources that were not retrieved."
    )

    try:
        findings = await llm.generate_json(
            prompt=prompt,
            schema=ContextLensFindings,
            system_instruction=system_instruction
        )
        
        db = config.get("configurable", {}).get("db")
        session_id = config.get("configurable", {}).get("session_id")
        if db and session_id:
            try:
                import asyncio
                query = db.table("lens_findings").upsert({
                    "session_id": session_id,
                    "lens_type": "context",
                    "findings": findings.model_dump()
                })
                await asyncio.to_thread(query.execute)
            except Exception:
                pass
                
        return {"context_findings": findings}
    except Exception as e:
        return {"errors": {"context": f"Context lens failed: {str(e)}"}}
