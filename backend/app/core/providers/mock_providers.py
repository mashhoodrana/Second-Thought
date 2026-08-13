from typing import List, Type, Optional, Dict, Any
from pydantic import BaseModel
from app.core.protocols import LLMProvider, SearchProvider

class MockLLMProvider:
    def __init__(self):
        self.last_prompt = None
        self.last_system_instruction = None
        
    async def generate_json(
        self,
        prompt: str,
        schema: Type[BaseModel],
        system_instruction: Optional[str] = None
    ) -> BaseModel:
        self.last_prompt = prompt
        self.last_system_instruction = system_instruction
        
        schema_name = schema.__name__
        
        if "Source" in schema_name:
            return schema(
                domains=[
                    {
                        "domain": "example.com",
                        "reputation_score": 0.85,
                        "reliability_signals": ["established_news", "editorial_oversight"]
                    }
                ]
            )
        elif "Emotion" in schema_name:
            return schema(
                sentiment="neutral",
                emotional_tone=["calm", "informative"],
                sensationalism_score=0.1,
                emotional_pressure_signals=[],
                manipulative_language_detected=False
            )
        elif "Queries" in schema_name:
            return schema(queries=["test query 1", "test query 2"])
        elif "Claims" in schema_name:
            return schema(
                claims=[
                    {
                        "claim_text": "The claim is supported by news stories.",
                        "citation_source_id": "src_001",
                        "relationship": "corroborates"
                    }
                ]
            )
        elif "Evidence" in schema_name:
            return schema(
                search_queries_generated=["example query"],
                claims=[
                    {
                        "claim_text": "The claim is supported by news stories.",
                        "citation_source_id": "src_001",
                        "relationship": "corroborates"
                    }
                ],
                sources=[]
            )
        elif "Synthesis" in schema_name:
            return schema(
                what_we_found="According to our findings, the claim is corroborated by reports.",
                signals_to_notice="No strong emotional language or sensational elements detected.",
                what_remains_uncertain="We did not verify the specific date of the publication.",
                what_to_check_yourself="Verify if other independent news sites report this.",
                would_you_share_now="Consider if the source reputation is sufficient for you before sharing."
            )
        elif "Context" in schema_name:
            return schema(
                claim_topic="Testing claims",
                entities=["Entity A", "Entity B"],
                temporal_context="unknown",
                geographic_context="unknown",
                missing_context="None",
                misleading_wording_analysis="None",
                background_facts=["Fact 1 [src_001]"],
                context_established=True
            )
        elif "AI" in schema_name or "Reasoning" in schema_name:
            return schema(
                reasoning_patterns=[
                    {
                        "pattern_type": "correlation vs causation",
                        "description": "Explaining causation vs correlation.",
                        "potential_issue": "The claim assumes causation."
                    }
                ]
            )
        elif "Thinking" in schema_name:
            return schema(
                questions=[
                    {
                        "question_text": "Who is the publisher of this claim?",
                        "category": "source",
                        "rationale": "Verify reliability of the source."
                    },
                    {
                        "question_text": "What is the evidence supporting this claim?",
                        "category": "evidence",
                        "rationale": "Verify factual grounding."
                    },
                    {
                        "question_text": "Is the wording emotional?",
                        "category": "emotion",
                        "rationale": "Check sensationalism load."
                    }
                ]
            )
        elif "ImageExtraction" in schema_name or "Extraction" in schema_name:
            return schema(
                visible_text="Mock visible text transcribed from test image.",
                extracted_claim="Mock core claim extracted from test image.",
                entities_and_context="Mock Entity, Mock location, 2026."
            )
        else:
            # Try to return default or empty model if schema has optional fields
            return schema.model_validate({})


class MockSearchProvider:
    def __init__(self):
        self.last_query = None
        
    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        self.last_query = query
        return [
            {
                "url": "https://example.com/story",
                "title": "Story Title",
                "publisher": "example.com",
                "retrieved_at": "2026-08-10T12:00:00Z",
                "snippet": "Text excerpt from news corroborating the claim."
            }
        ]
