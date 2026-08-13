import httpx
from datetime import datetime, timezone
from urllib.parse import urlparse
from typing import List, Dict, Any
from app.core.protocols import SearchProvider

class TavilySearchProvider(SearchProvider):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.url = "https://api.tavily.com/search"

    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        if not self.api_key:
            raise ValueError("Tavily API key is not configured.")
        
        payload = {
            "api_key": self.api_key,
            "query": query,
            "max_results": max_results,
            "search_depth": "basic",
            "include_answer": False,
            "include_raw_content": False
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.url, json=payload, timeout=10.0)
                response.raise_for_status()
                data = response.json()
            except Exception as e:
                # Returns empty list on failure to prevent entire analysis from failing
                return []
                
        results = []
        now_str = datetime.now(timezone.utc).isoformat()
        for res in data.get("results", []):
            url = res.get("url", "")
            domain = urlparse(url).netloc if url else ""
            if domain.startswith("www."):
                domain = domain[4:]
                
            results.append({
                "url": url,
                "title": res.get("title", "Untitled Source"),
                "publisher": domain or "unknown",
                "retrieved_at": now_str,
                "snippet": res.get("content", "")
            })
            
        return results
