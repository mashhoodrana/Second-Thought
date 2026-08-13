from langchain_core.runnables import RunnableConfig
from app.models.findings import EmotionLensFindings
from app.core.protocols import LLMProvider

async def run_emotion_lens(state: dict, config: RunnableConfig) -> dict:
    """
    Executes the Emotion Lens.
    Analyzes the input text for sentiment, emotional tones (fear, urgency, excitement, calm),
    sensationalism score, and specific emotional pressure signals (e.g., 'SHARE THIS NOW').
    """
    llm: LLMProvider = config.get("configurable", {}).get("llm")
    if not llm:
        return {"errors": {"emotion": "LLM provider not configured"}}
        
    sanitized_input = state.get("sanitized_input", "")
    
    prompt = f"""
    Analyze the emotional characteristics of the following claim:
    
    Claim: "{sanitized_input}"
    
    Identify:
    1. Overall sentiment (e.g., neutral, negative, positive).
    2. Emotional tones (e.g., fear, urgency, excitement, anger, calm).
    3. Sensationalism score (0.0 to 1.0).
    4. Specific emotional pressure phrases or styling (e.g., urgent commands, warnings).
    5. Whether manipulative language is detected.
    
    Provide the analysis matching the schema structure.
    """
    
    system_instruction = (
        "You are Second Thought's Emotion Lens. Assess the emotional load and pressure tactics "
        "used in the claim. Frame emotional language not as evidence of falsehood, but as a "
        "cognitive pressure signal that teaches users to pause and verify."
    )
    
    try:
        findings = await llm.generate_json(
            prompt=prompt,
            schema=EmotionLensFindings,
            system_instruction=system_instruction
        )
        
        db = config.get("configurable", {}).get("db")
        session_id = config.get("configurable", {}).get("session_id")
        if db and session_id:
            try:
                import asyncio
                query = db.table("lens_findings").upsert({
                    "session_id": session_id,
                    "lens_type": "emotion",
                    "findings": findings.model_dump()
                })
                await asyncio.to_thread(query.execute)
            except Exception:
                pass
                
        return {"emotion_findings": findings}
    except Exception as e:
        return {"errors": {"emotion": f"Emotion lens failed: {str(e)}"}}
