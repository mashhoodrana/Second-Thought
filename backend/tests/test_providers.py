import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.models.findings import SourceLensFindings, EmotionLensFindings
from app.core.providers.mock_providers import MockLLMProvider, MockSearchProvider
from app.core.providers.tavily_provider import TavilySearchProvider

@pytest.mark.asyncio
async def test_mock_llm_provider_generation():
    provider = MockLLMProvider()
    source_res = await provider.generate_json("test prompt", SourceLensFindings)
    assert isinstance(source_res, SourceLensFindings)
    assert len(source_res.domains) > 0
    assert source_res.domains[0].domain == "example.com"
    
    emotion_res = await provider.generate_json("test prompt", EmotionLensFindings)
    assert isinstance(emotion_res, EmotionLensFindings)
    assert emotion_res.sentiment == "neutral"

@pytest.mark.asyncio
async def test_mock_search_provider():
    provider = MockSearchProvider()
    results = await provider.search("some query")
    assert len(results) == 1
    assert results[0]["publisher"] == "example.com"
    assert results[0]["url"] == "https://example.com/story"

@pytest.mark.asyncio
async def test_tavily_provider_parsing():
    provider = TavilySearchProvider(api_key="test_api_key")
    
    mock_response_data = {
        "results": [
            {
                "title": "Test Title",
                "url": "https://news.bbc.co.uk/story-url",
                "content": "This is a search snippet.",
                "score": 0.95
            }
        ]
    }
    
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_response_data
        mock_post.return_value = mock_response
        
        results = await provider.search("test query")
        
        assert len(results) == 1
        assert results[0]["url"] == "https://news.bbc.co.uk/story-url"
        assert results[0]["title"] == "Test Title"
        assert results[0]["publisher"] == "news.bbc.co.uk"
        assert results[0]["snippet"] == "This is a search snippet."
        assert "retrieved_at" in results[0]
