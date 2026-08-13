import pytest
from app.core.providers.mock_providers import MockLLMProvider, MockSearchProvider
from app.core.langgraph.graph import create_investigation_graph
from app.models.findings import SourceLensFindings, EmotionLensFindings, EvidenceLensFindings, SynthesisFindings

@pytest.mark.asyncio
async def test_langgraph_full_execution():
    graph = create_investigation_graph()
    initial_state = {
        "original_input": "Test claim about bbc.co.uk",
        "sanitized_input": "Test claim about bbc.co.uk",
        "source_findings": None,
        "emotion_findings": None,
        "evidence_findings": None,
        "synthesis": None,
        "errors": {}
    }
    
    config = {
        "configurable": {
            "llm": MockLLMProvider(),
            "search": MockSearchProvider()
        }
    }
    
    result = await graph.ainvoke(initial_state, config=config)
    
    assert result is not None
    assert isinstance(result["source_findings"], SourceLensFindings)
    assert isinstance(result["emotion_findings"], EmotionLensFindings)
    assert isinstance(result["evidence_findings"], EvidenceLensFindings)
    assert isinstance(result["synthesis"], SynthesisFindings)
    assert not result["errors"]

    # Verify that all evidence claims reference valid source IDs
    evidence = result["evidence_findings"]
    valid_ids = {s.source_id for s in evidence.sources}
    for claim in evidence.claims:
        assert claim.citation_source_id in valid_ids

@pytest.mark.asyncio
async def test_langgraph_partial_lens_failure():
    # Simulate a partial failure in the source lens
    class FailingLLMProvider(MockLLMProvider):
        async def generate_json(self, prompt, schema, system_instruction=None):
            if "Source" in schema.__name__:
                raise ValueError("Simulated LLM crash in source lens")
            return await super().generate_json(prompt, schema, system_instruction)
            
    graph = create_investigation_graph()
    initial_state = {
        "original_input": "Test claim",
        "sanitized_input": "Test claim",
        "source_findings": None,
        "emotion_findings": None,
        "evidence_findings": None,
        "synthesis": None,
        "errors": {}
    }
    
    config = {
        "configurable": {
            "llm": FailingLLMProvider(),
            "search": MockSearchProvider()
        }
    }
    
    result = await graph.ainvoke(initial_state, config=config)
    
    # Verify that graph execution completed despite the Source Lens failure
    assert result is not None
    assert result["source_findings"] is None
    assert "source" in result["errors"]
    assert "crash in source lens" in result["errors"]["source"]
    
    # Verify that other lenses and synthesis were compiled successfully
    assert result["emotion_findings"] is not None
    assert result["evidence_findings"] is not None
    assert result["synthesis"] is not None
