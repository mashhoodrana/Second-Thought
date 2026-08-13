import json
import logging
from uuid import UUID
from datetime import datetime, timezone
from app.core.config import get_settings
from app.core.database import get_user_db_client
from app.core.utils.pii import scrub_pii
from app.core.langgraph.graph import create_investigation_graph
from app.core.providers.gemini_provider import GeminiProvider
from app.core.providers.tavily_provider import TavilySearchProvider
from app.core.providers.mock_providers import MockLLMProvider, MockSearchProvider

logger = logging.getLogger(__name__)

class InvestigationProcessingService:
    @staticmethod
    async def process_investigation(session_id: UUID, original_input: str, user_token: str) -> None:
        """
        Executes the full investigation lifecycle using LangGraph:
        1. Set session status to processing.
        2. Scrub PII from input.
        3. Run LangGraph StateGraph (parallel lenses: Source, Emotion, Evidence).
        4. Validate citations and source IDs.
        5. Persist lens findings and synthesis.
        6. Set session status to complete.
        
        Handles and tracks execution errors gracefully, updating the session status to error.
        """
        settings = get_settings()
        db = get_user_db_client(user_token, settings)
        session_id_str = str(session_id)
        
        # 1. Update session status to 'processing'
        try:
            import asyncio
            query = db.table("investigation_sessions").update({
                "status": "processing"
            }).eq("id", session_id_str)
            await asyncio.to_thread(query.execute)
        except Exception as e:
            logger.error(f"Failed to update session status to processing: {e}")
            return
            
        try:
            # 2. Instantiate providers (fallback to Mock in tests or if keys missing)
            if settings.app_env == "test" or not settings.gemini_api_key:
                llm = MockLLMProvider()
            else:
                model_name = settings.gemini_analysis_model or settings.gemini_default_model or "gemini-2.5-flash"
                llm = GeminiProvider(api_key=settings.gemini_api_key, model_name=model_name)
                
            if settings.app_env == "test" or not settings.search_api_key:
                search_prov = MockSearchProvider()
            else:
                search_prov = TavilySearchProvider(api_key=settings.search_api_key)

            # 3. Check for image content and run claim extraction
            import asyncio
            user_claim_text = ""
            image_raw = None
            if original_input.startswith("data:image/"):
                image_raw = original_input
            elif "|||" in original_input:
                user_claim_text, image_raw = original_input.split("|||", 1)
                user_claim_text = user_claim_text.strip()
                image_raw = image_raw.strip()

            if image_raw and image_raw.startswith("data:image/"):
                try:
                    header, base64_data = image_raw.split(",", 1)
                    mime_type = header.split(";")[0].split(":")[1]
                    import base64
                    image_bytes = base64.b64decode(base64_data)
                except Exception as e:
                    logger.error(f"Failed to parse base64 image: {e}")
                    raise ValueError("Invalid image base64 format") from e
                
                from app.models.findings import ImageExtractionResult
                from google.genai import types
                
                prompt_text = (
                    "Identify and extract all visible text or transcription from the image. "
                    "Identify any key entities (people, organizations, locations, logos, events, or dates). "
                    "Construct a clear, concise summary of the core claim, assertion, or social media news post presented in the image."
                )
                if user_claim_text:
                    prompt_text += f"\nNote: The user provided the following additional claim description/context for this image: '{user_claim_text}'"
                
                if settings.app_env == "test" or not settings.gemini_api_key:
                    contents = prompt_text
                else:
                    contents = [
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        prompt_text
                    ]
                
                extraction = await llm.generate_json(
                    prompt=contents,
                    schema=ImageExtractionResult,
                    system_instruction="You are an objective media and information literacy assistant. Extract details neutrally. Do not make truth judgments."
                )
                
                claim_summary = extraction.extracted_claim.strip()
                text_transcription = extraction.visible_text.strip()
                context_entities = extraction.entities_and_context.strip()
                
                compiled_text = (
                    f"Core Claim: {claim_summary}\n"
                    f"User Context: {user_claim_text}\n"
                    f"Transcription: {text_transcription}\n"
                    f"Visual Context/Entities: {context_entities}"
                )
                
                # Update session title dynamically
                claim_title = user_claim_text if user_claim_text else claim_summary
                claim_title = claim_title if len(claim_title) <= 70 else claim_title[:67] + "..."
                try:
                    query_title = db.table("investigation_sessions").update({
                        "title": claim_title
                    }).eq("id", session_id_str)
                    await asyncio.to_thread(query_title.execute)
                except Exception as e:
                    logger.error(f"Failed to update session title for image: {e}")
                
                # Set input strings for text graph matching
                if user_claim_text:
                    original_input = f"{user_claim_text} ({claim_summary})"
                else:
                    original_input = claim_summary if claim_summary else text_transcription
                sanitized_input = compiled_text
            else:
                sanitized_input = original_input

            # 4. Scrub detectable structured PII (emails, phone numbers)
            sanitized_input = scrub_pii(sanitized_input)
            
            # Store sanitized input in DB
            query = db.table("investigation_inputs").update({
                "sanitized_text": sanitized_input
            }).eq("session_id", session_id_str)
            await asyncio.to_thread(query.execute)
            
            # 5. Invoke LangGraph StateGraph
            graph = create_investigation_graph()
            initial_state = {
                "original_input": original_input,
                "sanitized_input": sanitized_input,
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
                    "llm": llm,
                    "search": search_prov,
                    "db": db,
                    "session_id": session_id_str
                }
            }
            
            result = await graph.ainvoke(initial_state, config=config)
            
            # Save any partial graph execution errors in session errors if occurred
            errors = result.get("errors", {})
            error_msg = None
            if errors:
                error_msg = f"Partial lens failures: {json.dumps(errors)}"
                
            # 6. Mark session complete
            query = db.table("investigation_sessions").update({
                "status": "complete",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_message": error_msg
            }).eq("id", session_id_str)
            await asyncio.to_thread(query.execute)
            
        except Exception as e:
            logger.exception(f"Unhandled exception during investigation processing: {e}")
            try:
                query_err = db.table("investigation_sessions").update({
                    "status": "error",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "error_message": str(e)
                }).eq("id", session_id_str)
                await asyncio.to_thread(query_err.execute)
            except Exception as db_err:
                logger.error(f"Failed to record session error state: {db_err}")
