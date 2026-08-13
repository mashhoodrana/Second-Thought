import asyncio
from google import genai
from google.genai import types
from google.genai.errors import APIError
from pydantic import BaseModel
from typing import Type, Optional, Any, List, Union
from app.core.protocols import LLMProvider

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model_name: str):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name

    async def generate_json(
        self,
        prompt: Union[str, List[Any]],
        schema: Type[BaseModel],
        system_instruction: Optional[str] = None
    ) -> BaseModel:
        max_retries = 3
        backoff_factor = 2.0
        delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Wrap the synchronous SDK generation in asyncio.to_thread to prevent blocking the event loop
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=schema,
                        system_instruction=system_instruction
                    )
                )
                
                return schema.model_validate_json(response.text)
                
            except APIError as e:
                # Retry on rate limits (429) or transient 5xx server issues
                if (e.code == 429 or e.code >= 500) and attempt < max_retries - 1:
                    await asyncio.sleep(delay)
                    delay *= backoff_factor
                else:
                    raise e
            except Exception as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(delay)
                    delay *= backoff_factor
                else:
                    raise e
