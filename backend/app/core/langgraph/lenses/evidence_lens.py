import asyncio
from typing import List
from pydantic import BaseModel, Field
from langchain_core.runnables import RunnableConfig
from app.models.findings import EvidenceLensFindings, EvidenceSource, EvidenceClaim
from app.core.protocols import LLMProvider, SearchProvider

class SearchQueriesSchema(BaseModel):
    queries: List[str] = Field(..., description="2-3 search queries optimized to investigate the claim")

class ExtractedClaimsSchema(BaseModel):
    claims: List[EvidenceClaim] = Field(..., description="Claims extracted strictly from the provided search snippets")

async def run_evidence_lens(state: dict, config: RunnableConfig) -> dict:
    """
    Executes the Evidence Lens.
    1. Generates query terms from the sanitized claim.
    2. Retrieves search pages via SearchProvider.
    3. Formats sources with generated IDs (src_001, src_002, ...).
    4. Extracts claims from the search results, referencing these IDs.
    """
    llm: LLMProvider = config.get("configurable", {}).get("llm")
    search_prov: SearchProvider = config.get("configurable", {}).get("search")
    
    if not llm or not search_prov:
        return {"errors": {"evidence": "LLM or Search provider not configured"}}
        
    sanitized_input = state.get("sanitized_input", "")
    
    # 1. Generate search queries
    query_prompt = f"""
    Given the following claim:
    Claim: "{sanitized_input}"
    
    Generate 2 to 3 search engine queries optimized to retrieve news articles, fact checks, or primary sources regarding this claim.
    """
    
    try:
        queries_response = await llm.generate_json(
            prompt=query_prompt,
            schema=SearchQueriesSchema,
            system_instruction="You are Second Thought's query generation utility. Generate search engine queries."
        )
        queries = queries_response.queries
    except Exception as e:
        return {"errors": {"evidence": f"Query generation failed: {str(e)}"}}
        
    # 2. Perform search queries concurrently and deduplicate results
    search_tasks = [search_prov.search(query, max_results=3) for query in queries]
    all_results = await asyncio.gather(*search_tasks, return_exceptions=True)
    
    seen_urls = set()
    raw_results = []
    
    for results in all_results:
        if isinstance(results, Exception):
            continue
        for res in results:
            url = res.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                raw_results.append(res)
                
    # Limit to top 5 unique results
    raw_results = raw_results[:5]
    
    # 3. Assign Source IDs (src_001, src_002, etc.)
    sources: List[EvidenceSource] = []
    for idx, res in enumerate(raw_results):
        source_id = f"src_{idx + 1:03d}"
        sources.append(EvidenceSource(
            source_id=source_id,
            url=res["url"],
            title=res["title"],
            publisher=res["publisher"],
            retrieved_at=res["retrieved_at"],
            snippet=res["snippet"]
        ))
        
    if not sources:
        # No search results found
        return {
            "evidence_findings": EvidenceLensFindings(
                search_queries_generated=queries,
                claims=[],
                sources=[]
            )
        }
        
    # 4. Extract claims grounded in search results
    sources_text = ""
    for s in sources:
        sources_text += f"Source ID: {s.source_id}\nPublisher: {s.publisher}\nSnippet: {s.snippet}\n\n"
        
    extraction_prompt = f"""
    You are an evidence extraction assistant.
    User Claim to investigate: "{sanitized_input}"
    
    Below are the search results retrieved for this claim. Extract specific statements of fact, claims, or arguments reported in these snippets.
    
    {sources_text}
    
    For each extracted claim:
    - Write the exact claim text.
    - Reference the correct Source ID (e.g. src_001) from which it was extracted. Do not invent any Source IDs.
    - Classify its relationship to the User Claim as:
        - "corroborates": if the search snippet supports or confirms the user's claim.
        - "contradicts": if the search snippet refutes or states the user's claim is false.
        - "unverified": if the search snippet discusses the claim but cannot verify it, or contains uncertainty.
        
    Strictly ground your extractions in the snippets provided. Do not use external knowledge or invent any claims.
    """
    
    try:
        claims_response = await llm.generate_json(
            prompt=extraction_prompt,
            schema=ExtractedClaimsSchema,
            system_instruction="Extract grounded claims from search snippets. Reference source IDs."
        )
        
        # Validate that all claims reference valid source IDs
        valid_ids = {s.source_id for s in sources}
        validated_claims = []
        for claim in claims_response.claims:
            if claim.citation_source_id in valid_ids:
                validated_claims.append(claim)
                
        findings = EvidenceLensFindings(
            search_queries_generated=queries,
            claims=validated_claims,
            sources=sources
        )
        
        db = config.get("configurable", {}).get("db")
        session_id = config.get("configurable", {}).get("session_id")
        if db and session_id:
            try:
                query = db.table("lens_findings").upsert({
                    "session_id": session_id,
                    "lens_type": "evidence",
                    "findings": findings.model_dump()
                })
                await asyncio.to_thread(query.execute)
            except Exception:
                pass
                
        return {"evidence_findings": findings}
    except Exception as e:
        return {"errors": {"evidence": f"Claims extraction failed: {str(e)}"}}
