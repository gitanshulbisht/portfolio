"""
ai_assistant.py: FastAPI router handling Text and Voice AI chatbot interactions powered by Google Gemini.
"""

import os
import logging
from typing import List, Optional
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from ai_context import build_chat_system_instruction, build_voice_system_instruction

logger = logging.getLogger(__name__)
ai_router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'model'")
    content: str = Field(..., min_length=1, max_length=2000)

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1)

class ChatResponse(BaseModel):
    reply: str
    suggested_followups: List[str]

class VoiceChatRequest(BaseModel):
    transcript: str = Field(..., min_length=1, max_length=1000)
    history: Optional[List[ChatMessage]] = Field(default_factory=list)

class VoiceChatResponse(BaseModel):
    reply: str

DEFAULT_FOLLOWUPS = [
    "Tell me about Anshul's DevOps projects",
    "What are his core programming languages?",
    "How can I contact Anshul for opportunities?"
]

async def call_groq_api(system_prompt: str, user_prompt: str, chat_history: Optional[List[ChatMessage]] = None) -> Optional[str]:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None

    messages = [{"role": "system", "content": system_prompt}]
    if chat_history:
        for msg in chat_history[-8:]:
            role = "assistant" if msg.role == "model" else "user"
            messages.append({"role": role, "content": msg.content})
    messages.append({"role": "user", "content": user_prompt})

    groq_models = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"]
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        for model in groq_models:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.6,
                "max_tokens": 800,
            }
            try:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices", [])
                    if choices and "message" in choices[0]:
                        content = choices[0]["message"].get("content")
                        if content:
                            return content.strip()
                else:
                    logger.warning(f"Groq ({model}) returned {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.warning(f"Groq API error ({model}): {e}")

    return None

async def call_gemini_api(system_prompt: str, user_prompt: str, chat_history: Optional[List[ChatMessage]] = None) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("Neither GROQ_API_KEY nor GEMINI_API_KEY set.")
        return (
            "Anshul's AI assistant is currently in preview mode. "
            "To connect live AI responses, set GROQ_API_KEY or GEMINI_API_KEY in the backend environment."
        )

    raw_turns = []
    if chat_history:
        for msg in chat_history[-8:]:
            role = "user" if msg.role == "user" else "model"
            raw_turns.append({"role": role, "parts": [{"text": msg.content}]})

    raw_turns.append({"role": "user", "parts": [{"text": user_prompt}]})

    # Gemini requires contents to start with 'user' role
    while raw_turns and raw_turns[0]["role"] == "model":
        raw_turns.pop(0)

    # Coalesce consecutive turns with the same role so turns strictly alternate
    contents = []
    for turn in raw_turns:
        if contents and contents[-1]["role"] == turn["role"]:
            contents[-1]["parts"][0]["text"] += "\n" + turn["parts"][0]["text"]
        else:
            contents.append(turn)

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 800,
        }
    }

    # Model fallback chain in case of temporary high-demand (503) spikes on Google Generative Language API
    configured_model = os.environ.get("GEMINI_MODEL")
    candidate_models = (
        [configured_model] if configured_model else
        ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-3.6-flash"]
    )

    async with httpx.AsyncClient(timeout=35.0) as client:
        last_error = None
        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            return parts[0]["text"].strip()
                elif resp.status_code in (503, 429):
                    logger.warning(f"Model {model} returned status {resp.status_code}, trying next model in chain...")
                    continue
                else:
                    logger.error(f"Gemini API ({model}) returned error {resp.status_code}: {resp.text}")
                    last_error = resp.text
            except httpx.TimeoutException:
                logger.warning(f"Gemini model {model} timed out, trying next candidate...")
                continue
            except Exception as e:
                logger.error(f"Unexpected error calling Gemini API ({model}): {e}", exc_info=True)
                last_error = str(e)

        if last_error:
            logger.error(f"All candidate Gemini models failed. Last error: {last_error}")
        return "I apologize, but I am having trouble connecting to my AI core right now. Please try again shortly."

async def call_ai_engine(system_prompt: str, user_prompt: str, chat_history: Optional[List[ChatMessage]] = None) -> str:
    # 1. Try Groq for high-quota, sub-second responses (14,400 requests/day free tier)
    groq_reply = await call_groq_api(system_prompt, user_prompt, chat_history)
    if groq_reply:
        return groq_reply

    # 2. Fall back to Gemini (500 requests/day free tier)
    return await call_gemini_api(system_prompt, user_prompt, chat_history)

@ai_router.post("/chat", response_model=ChatResponse)
async def handle_chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Messages cannot be empty")

    user_message = request.messages[-1].content
    history = request.messages[:-1]
    system_prompt = build_chat_system_instruction()

    reply = await call_ai_engine(system_prompt=system_prompt, user_prompt=user_message, chat_history=history)

    return ChatResponse(
        reply=reply,
        suggested_followups=DEFAULT_FOLLOWUPS
    )

@ai_router.post("/voice-chat", response_model=VoiceChatResponse)
async def handle_voice_chat(request: VoiceChatRequest):
    transcript = request.transcript.strip()
    if not transcript:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transcript cannot be empty")

    system_prompt = build_voice_system_instruction()
    reply = await call_ai_engine(system_prompt=system_prompt, user_prompt=transcript, chat_history=request.history)

    return VoiceChatResponse(reply=reply)
