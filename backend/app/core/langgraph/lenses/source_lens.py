import re
from urllib.parse import urlparse
from langchain_core.runnables import RunnableConfig
from app.models.findings import SourceLensFindings, SourceDomainMetadata
from app.core.protocols import LLMProvider

# Simple domain extraction regex
DOMAIN_PATTERN = re.compile(r'\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b')

async def run_source_lens(state: dict, config: RunnableConfig) -> dict:
    """
    Executes the Source Lens.
    Identifies domains in the sanitized input text and evaluates their credibility.
    """
    llm: LLMProvider = config.get("configurable", {}).get("llm")
    if not llm:
        return {"errors": {"source": "LLM provider not configured"}}
        
    sanitized_input = state.get("sanitized_input", "")
    
    # Extract any potential domains mentioned in the input
    found_domains = []
    # If the input itself is or contains a URL, parse it
    urls = re.findall(r'https?://[^\s]+', sanitized_input)
    for url in urls:
        domain = urlparse(url).netloc
        if domain.startswith("www."):
            domain = domain[4:]
        if domain:
            found_domains.append(domain)
            
    # Also extract domain-like strings
    for match in DOMAIN_PATTERN.finditer(sanitized_input):
        domain = match.group(0).lower()
        # Avoid matching numbers or common non-domain extensions in text
        if not domain.replace(".", "").isdigit() and len(domain.split(".")) > 1:
            if domain not in found_domains:
                found_domains.append(domain)

    # Also extract domains from any retrieved search sources in the state
    evidence = state.get("evidence_findings")
    if evidence and evidence.sources:
        for src in evidence.sources:
            if src.publisher and src.publisher != "unknown":
                if src.publisher not in found_domains:
                    found_domains.append(src.publisher)
                
    # If no domains are found in the user text, we pass the text to the LLM to identify implied domains/publishers
    prompt = f"""
    Analyze the following user-submitted claim and identify any news publishers or website domains either mentioned or heavily implied.
    
    User Claim: "{sanitized_input}"
    
    Extracted domains so far: {found_domains}
    
    For each identified domain, evaluate its general reputation score (0.0 to 1.0) and reliability signals (e.g., 'established_news', 'independent_blog', 'unverified_social_media', 'editorial_oversight').
    
    Strictly follow the output schema.
    """
    
    system_instruction = (
        "You are Second Thought's Source Lens. Evaluate the credibility of news publishers "
        "and website domains. Do not invent or reference domain-age information."
    )
    
    try:
        findings = await llm.generate_json(
            prompt=prompt,
            schema=SourceLensFindings,
            system_instruction=system_instruction
        )
        
        db = config.get("configurable", {}).get("db")
        session_id = config.get("configurable", {}).get("session_id")
        if db and session_id:
            try:
                import asyncio
                query = db.table("lens_findings").upsert({
                    "session_id": session_id,
                    "lens_type": "source",
                    "findings": findings.model_dump()
                })
                await asyncio.to_thread(query.execute)
            except Exception:
                pass
                
        return {"source_findings": findings}
    except Exception as e:
        return {"errors": {"source": f"Source lens failed: {str(e)}"}}
