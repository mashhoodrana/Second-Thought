from typing import List, Type, Optional, Protocol, Dict, Any, Union
from pydantic import BaseModel

class LLMProvider(Protocol):
    async def generate_json(
        self,
        prompt: Union[str, List[Any]],
        schema: Type[BaseModel],
        system_instruction: Optional[str] = None
    ) -> BaseModel:
        """
        Generates structured JSON output from the LLM, validated by the given Pydantic schema.
        """
        ...

class SearchProvider(Protocol):
    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Performs external search retrieval and returns raw search results list of dicts.
        Expected format:
        [
            {
                "url": "https://example.com/story",
                "title": "Story Title",
                "snippet": "Story snippet text",
                "domain": "example.com"
            }
        ]
        """
        ...
