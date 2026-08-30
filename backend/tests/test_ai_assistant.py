import pytest
from ai_context import get_portfolio_context, build_chat_system_instruction, build_voice_system_instruction

def test_portfolio_context_contains_key_details():
    context = get_portfolio_context()
    assert "Anshul Bisht" in context
    assert "DevOps" in context or "Full-Stack" in context
    assert "gitanshulbisht" in context

def test_chat_system_instruction_format():
    instruction = build_chat_system_instruction()
    assert "Anshul" in instruction
    assert len(instruction) > 100

def test_voice_system_instruction_enforces_brevity():
    instruction = build_voice_system_instruction()
    assert "concise" in instruction.lower() or "1-3 sentences" in instruction.lower()

from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI
from ai_assistant import ai_router

test_app = FastAPI()
test_app.include_router(ai_router)
client = TestClient(test_app)

def test_chat_endpoint_valid_request():
    with patch("ai_assistant.call_gemini_api", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = "Hello! I am Anshul's AI assistant."
        response = client.post(
            "/api/ai/chat",
            json={"messages": [{"role": "user", "content": "What is Anshul's tech stack?"}]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["reply"] == "Hello! I am Anshul's AI assistant."
        assert "suggested_followups" in data
        assert len(data["suggested_followups"]) > 0

def test_voice_chat_endpoint_valid_request():
    with patch("ai_assistant.call_gemini_api", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = "Anshul is a Full-Stack and DevOps engineer."
        response = client.post(
            "/api/ai/voice-chat",
            json={"transcript": "Who is Anshul?"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["reply"] == "Anshul is a Full-Stack and DevOps engineer."

def test_chat_endpoint_empty_messages():
    response = client.post("/api/ai/chat", json={"messages": []})
    assert response.status_code == 422 or response.status_code == 400

