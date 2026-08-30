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
