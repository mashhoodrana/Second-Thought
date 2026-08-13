from typing import List, Literal, Optional
from pydantic import BaseModel, Field

class SourceDomainMetadata(BaseModel):
    domain: str
    reputation_score: float = Field(..., description="Score from 0.0 (unreliable) to 1.0 (highly reliable)")
    reliability_signals: List[str] = Field(..., description="Signals like 'established_news', 'personal_blog', 'editorial_oversight', etc.")

class SourceLensFindings(BaseModel):
    domains: List[SourceDomainMetadata]

class EmotionLensFindings(BaseModel):
    sentiment: str = Field(..., description="Overall sentiment tone e.g. neutral, negative, positive")
    emotional_tone: List[str] = Field(..., description="Key emotional tones detected, e.g. fear, urgency, excitement, calm")
    sensationalism_score: float = Field(..., description="Sensationalism score from 0.0 to 1.0")
    emotional_pressure_signals: List[str] = Field(..., description="Specific phrasing indicating emotional pressure e.g. 'MUST SHARE NOW'")
    manipulative_language_detected: bool

class EvidenceSource(BaseModel):
    source_id: str = Field(..., description="Identifier like src_001, src_002, etc.")
    url: str = Field(..., description="The verified URL retrieved from search")
    title: str = Field(..., description="The title of the page/article")
    publisher: str = Field(..., description="The domain or publisher name")
    retrieved_at: str = Field(..., description="ISO 8601 retrieval timestamp")
    snippet: str = Field(..., description="Excerpt of context matching the source")

class EvidenceClaim(BaseModel):
    claim_text: str = Field(..., description="The extracted claim/argument from search results")
    citation_source_id: str = Field(..., description="The source ID referencing where this claim was found, e.g. src_001")
    relationship: Literal["corroborates", "contradicts", "unverified"] = Field(..., description="Relationship of the search claim to the user claim")

class EvidenceLensFindings(BaseModel):
    search_queries_generated: List[str]
    claims: List[EvidenceClaim]
    sources: List[EvidenceSource]

class SynthesisFindings(BaseModel):
    what_we_found: str = Field(..., description="Grounded synthesis summary referencing source IDs (e.g. [src_001])")
    signals_to_notice: str = Field(..., description="Key signals noticed, emotional triggers, domain indicators")
    what_remains_uncertain: str = Field(..., description="Details that were unverified or conflicting")
    what_to_check_yourself: str = Field(..., description="Constructive action steps for the user to investigate further")
    would_you_share_now: str = Field(..., description="A critical thinking question prompting the user's sharing decision")

class ContextLensFindings(BaseModel):
    claim_topic: str = Field(..., description="What the claim is actually about")
    entities: List[str] = Field(..., description="Important entities involved (people, organizations, locations, etc.)")
    temporal_context: str = Field(..., description="Relevant time/date context if available, otherwise 'unknown'")
    geographic_context: str = Field(..., description="Relevant geographic context if available, otherwise 'unknown'")
    missing_context: str = Field(..., description="Any context that is missing or could make the claim misleading without it. If none, return 'None'")
    misleading_wording_analysis: str = Field(..., description="Analysis of whether the wording is misleading without additional context")
    background_facts: List[str] = Field(..., description="Important background facts needed to interpret the claim correctly. Each statement must be grounded and cite source IDs like [src_XXX] when dependent on retrieved evidence. If no facts can be established, return an empty list or 'insufficient evidence'.")
    context_established: bool = Field(..., description="True if sufficient context could be established, False if unknown / insufficient evidence")

class ReasoningPattern(BaseModel):
    pattern_type: str = Field(..., description="The reasoning pattern identified (e.g. 'correlation vs causation', 'false certainty', 'unsupported assumptions', 'missing evidence', 'misleading framing', 'appeal to emotion', etc.)")
    description: str = Field(..., description="Educational explanation of this pattern in the context of this claim")
    potential_issue: str = Field(..., description="Specific analysis of how this pattern manifests in the claim, explained objectively without declaring it false")

class AILensFindings(BaseModel):
    reasoning_patterns: List[ReasoningPattern] = Field(..., description="List of reasoning patterns or cognitive traps identified in the claim")

class ThinkingQuestion(BaseModel):
    question_text: str = Field(..., description="The thinking question itself")
    category: Literal["source", "evidence", "context", "emotion", "alternative explanation", "uncertainty"] = Field(..., description="The category of the question")
    rationale: str = Field(..., description="Why this question is relevant to the investigation based on the findings")

class ThinkingQuestionsFindings(BaseModel):
    questions: List[ThinkingQuestion] = Field(..., description="List of 3-5 highly relevant critical thinking questions")


class ImageExtractionResult(BaseModel):
    visible_text: str = Field(..., description="Extract all visible text or transcription from the image.")
    extracted_claim: str = Field(..., description="Summarize the core claim, news post, social media post, or assertion presented by the image.")
    entities_and_context: str = Field(..., description="Identify key entities (people, organizations), dates, locations, logos, or events depicted.")

