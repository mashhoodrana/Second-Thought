from langchain_core.runnables import RunnableConfig
from app.models.findings import SynthesisFindings
from app.core.protocols import LLMProvider

async def run_synthesis(state: dict, config: RunnableConfig) -> dict:
    """
    Executes the Synthesis node.
    Combines the results from Source, Emotion, and Evidence lenses and constructs the final educational synthesis.
    """
    llm: LLMProvider = config.get("configurable", {}).get("llm")
    if not llm:
        return {"errors": {"synthesis": "LLM provider not configured"}}
        
    original_input = state.get("original_input", "")
    source_findings = state.get("source_findings")
    emotion_findings = state.get("emotion_findings")
    evidence_findings = state.get("evidence_findings")
    errors = state.get("errors", {})
    
    # Build text descriptions of lens findings to feed into the prompt
    source_text = "No source metadata available."
    if source_findings and source_findings.domains:
        source_text = "Domains evaluated:\n"
        for d in source_findings.domains:
            source_text += f"- {d.domain}: reputation score={d.reputation_score}, signals={d.reliability_signals}\n"
            
    emotion_text = "No emotional pressure signals evaluated."
    if emotion_findings:
        emotion_text = (
            f"Sentiment: {emotion_findings.sentiment}\n"
            f"Tones: {emotion_findings.emotional_tone}\n"
            f"Sensationalism: {emotion_findings.sensationalism_score}\n"
            f"Manipulative language detected: {emotion_findings.manipulative_language_detected}\n"
            f"Pressure signals: {emotion_findings.emotional_pressure_signals}\n"
        )
        
    evidence_text = "No search evidence retrieved."
    if evidence_findings:
        evidence_text = "Retrieved sources:\n"
        for s in evidence_findings.sources:
            evidence_text += f"- {s.source_id}: title='{s.title}', publisher='{s.publisher}', snippet='{s.snippet}'\n"
        evidence_text += "\nExtracted claims:\n"
        for c in evidence_findings.claims:
            evidence_text += f"- Claim: '{c.claim_text}' (Source: {c.citation_source_id}, Relationship: {c.relationship})\n"
            
    prompt = f"""
    You are Second Thought's Synthesis Node. Your job is to compile the reports from the Source, Emotion, and Evidence lenses and generate an educational summary.
    
    User Claim: "{original_input}"
    
    === Source Lens Report ===
    {source_text}
    
    === Emotion Lens Report ===
    {emotion_text}
    
    === Evidence Lens Report ===
    {evidence_text}
    
    Errors during processing (if any): {errors}
    
    Compile the findings by answering the following five educational critical-thinking blocks:
    1. what_we_found: What did the search find? Summarize the evidence objectively. Cite source IDs (e.g. [src_001], [src_002]) to ground your statements. Do not invent any facts, claims, or URLs.
    2. signals_to_notice: Point out any structural signals like emotional pressure tactics, sensational wording, manipulative language, or publisher reputations that the user should be aware of.
    3. what_remains_uncertain: Point out what could not be verified, conflicting claims, or gaps in the information retrieved.
    4. what_to_check_yourself: Provide 2-3 constructive and specific actions the user can take to check this information independently.
    5. would_you_share_now: Frame a critical thinking question prompting the user to pause and think about whether they would share this message, and what impact sharing it could have.
    
    Strictly avoid issuing a binary true/false verdict. Instead, write in a way that guides the user to form their own judgment. Do not hallucinate any URLs.
    """
    
    system_instruction = (
        "You are Second Thought's educational synthesis node. Your purpose is to foster critical thinking "
        "and media literacy. You must never declare a claim definitively True or False. "
        "Summarize search findings objectively citing source IDs like [src_001] and teach users to evaluate "
        "the content themselves."
    )
    
    try:
        findings = await llm.generate_json(
            prompt=prompt,
            schema=SynthesisFindings,
            system_instruction=system_instruction
        )
        
        db = config.get("configurable", {}).get("db")
        session_id = config.get("configurable", {}).get("session_id")
        if db and session_id:
            try:
                import asyncio
                query = db.table("lens_findings").upsert({
                    "session_id": session_id,
                    "lens_type": "synthesis",
                    "findings": findings.model_dump()
                })
                await asyncio.to_thread(query.execute)
            except Exception:
                pass
                
        return {"synthesis": findings}
    except Exception as e:
        return {"errors": {"synthesis": f"Synthesis compilation failed: {str(e)}"}}
