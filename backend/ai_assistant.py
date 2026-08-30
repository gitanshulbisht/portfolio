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

async def call_gemini_api(system_prompt: str, user_prompt: str, chat_history: Optional[List[ChatMessage]] = None) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY environment variable not set.")
        return (
            "Anshul's AI assistant is currently in preview mode. "
            "To connect live AI responses, set the GEMINI_API_KEY in the backend environment."
        )

    model = os.environ.get("GEMINI_MODEL", "gemini-3.6-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    contents = []
    if chat_history:
        for msg in chat_history[-6:]:
            role = "user" if msg.role == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg.content}]})

    contents.append({"role": "user", "parts": [{"text": user_prompt}]})

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

    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.error(f"Gemini API returned error {resp.status_code}: {resp.text}")
                return "I apologize, but I am having trouble connecting to my AI core right now. Please try again shortly."
            
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"].strip()
            
            return "I understood your message, but didn't receive a complete response. How else can I assist?"
    except httpx.TimeoutException:
        logger.error("Gemini API call timed out")
        return "The AI service timed out while processing your request. Please try again in a moment."
    except Exception as e:
        logger.error(f"Unexpected error calling Gemini API: {e}", exc_info=True)
        return "An unexpected error occurred while communicating with the AI service."

@ai_router.post("/chat", response_model=ChatResponse)
async def handle_chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Messages cannot be empty")

    user_message = request.messages[-1].content
    history = request.messages[:-1]
    system_prompt = build_chat_system_instruction()

    reply = await call_gemini_api(system_prompt=system_prompt, user_prompt=user_message, chat_history=history)

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
    reply = await call_gemini_api(system_prompt=system_prompt, user_prompt=transcript, chat_history=request.history)

    return VoiceChatResponse(reply=reply)
