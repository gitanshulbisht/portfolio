"""
ai_assistant.py: FastAPI router handling Text and Voice AI chatbot interactions powered by Google Gemini.
"""

import os
import time
import logging
from typing import List, Optional, Tuple
import httpx
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from ai_context import build_chat_system_instruction, build_voice_system_instruction
from ai_guardrails import (
    chat_limiter,
    voice_limiter,
    check_prompt_injection,
    SAFE_DEFLECTION_MESSAGE,
)
from ai_metrics import ai_metrics

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

ACTIVE_CONFIG = {
    "provider": os.environ.get("DEFAULT_AI_PROVIDER", "auto")
}

def get_ai_provider() -> str:
    return ACTIVE_CONFIG.get("provider", "auto")

def set_ai_provider(provider: str):
    if provider in ("groq", "gemini", "auto"):
        ACTIVE_CONFIG["provider"] = provider

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
                            logger.info(f"Generated AI response via Groq ({model})")
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
                            logger.info(f"Generated AI response via Gemini ({model})")
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

def get_client_ip(req: Request) -> str:
    """Extracts client IP from X-Forwarded-For header or direct client host."""
    forwarded = req.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
        if ip:
            return ip
    if req.client and req.client.host:
        return req.client.host
    return "127.0.0.1"


async def call_ai_engine(
    system_prompt: str,
    user_prompt: str,
    chat_history: Optional[List[ChatMessage]] = None,
) -> Tuple[str, str, str]:
    """
    Routes AI request based on active provider configuration.
    Returns:
        Tuple[reply: str, engine_used: str, status: str]
        where engine_used is 'groq' or 'gemini',
        and status is 'success' or 'fallback'.
    """
    provider = get_ai_provider()

    # 1. If explicit Gemini mode is chosen
    if provider == "gemini":
        reply = await call_gemini_api(system_prompt, user_prompt, chat_history)
        return reply, "gemini", "success"

    # 2. If explicit Groq mode is chosen
    if provider == "groq":
        groq_reply = await call_groq_api(system_prompt, user_prompt, chat_history)
        if groq_reply:
            return groq_reply, "groq", "success"
        # If Groq has transient network/quota failure, fallback to Gemini
        gemini_reply = await call_gemini_api(system_prompt, user_prompt, chat_history)
        return gemini_reply, "gemini", "fallback"

    # 3. "auto" (default): Groq first (14,400 free req/day), auto-fallback to Gemini
    has_groq_key = bool(os.environ.get("GROQ_API_KEY"))
    groq_reply = await call_groq_api(system_prompt, user_prompt, chat_history)
    if groq_reply:
        return groq_reply, "groq", "success"

    gemini_reply = await call_gemini_api(system_prompt, user_prompt, chat_history)
    status_str = "fallback" if has_groq_key else "success"
    return gemini_reply, "gemini", status_str


@ai_router.post("/chat", response_model=ChatResponse)
async def handle_chat(request: ChatRequest, req: Request):
    if not request.messages:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Messages cannot be empty")

    client_ip = get_client_ip(req)

    # 1. Rate Limiting Check (10 req/min for chat)
    allowed, retry_after = chat_limiter.is_allowed(client_ip)
    if not allowed:
        ai_metrics.record_request(
            route="chat",
            engine="",
            duration_ms=0.0,
            status="rate_limited",
            client_ip=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a moment before sending another message.",
            headers={"Retry-After": str(retry_after)},
        )

    user_message = request.messages[-1].content

    # 2. Prompt Injection & Adversarial Jailbreak Guardrail
    deflection = check_prompt_injection(user_message)
    if deflection:
        prompt_tokens = len(user_message.split())
        ai_metrics.record_request(
            route="chat",
            engine="",
            duration_ms=0.0,
            status="blocked_injection",
            prompt_tokens=prompt_tokens,
            client_ip=client_ip,
        )
        return ChatResponse(
            reply=deflection,
            suggested_followups=DEFAULT_FOLLOWUPS,
        )

    history = request.messages[:-1]
    system_prompt = build_chat_system_instruction()

    # 3. High-resolution timing & LLM Dispatch
    start_time = time.perf_counter()
    res = await call_ai_engine(system_prompt=system_prompt, user_prompt=user_message, chat_history=history)
    duration_ms = (time.perf_counter() - start_time) * 1000.0

    if isinstance(res, tuple):
        if len(res) == 3:
            reply, engine_used, req_status = res
        elif len(res) == 2:
            reply, engine_used = res
            req_status = "success"
        else:
            reply = res[0]
            engine_used = "gemini"
            req_status = "success"
    else:
        reply = str(res)
        engine_used = "gemini"
        req_status = "success"

    prompt_tokens = max(1, int(len(user_message.split()) * 1.3))
    completion_tokens = max(1, int(len(reply.split()) * 1.3))

    ai_metrics.record_request(
        route="chat",
        engine=engine_used,
        duration_ms=duration_ms,
        status=req_status,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        client_ip=client_ip,
    )

    return ChatResponse(
        reply=reply,
        suggested_followups=DEFAULT_FOLLOWUPS,
    )


@ai_router.post("/voice-chat", response_model=VoiceChatResponse)
async def handle_voice_chat(request: VoiceChatRequest, req: Request):
    transcript = request.transcript.strip()
    if not transcript:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Transcript cannot be empty")

    client_ip = get_client_ip(req)

    # 1. Rate Limiting Check (15 req/min for voice)
    allowed, retry_after = voice_limiter.is_allowed(client_ip)
    if not allowed:
        ai_metrics.record_request(
            route="voice",
            engine="",
            duration_ms=0.0,
            status="rate_limited",
            client_ip=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a moment before sending another message.",
            headers={"Retry-After": str(retry_after)},
        )

    # 2. Prompt Injection Guardrail
    deflection = check_prompt_injection(transcript)
    if deflection:
        prompt_tokens = len(transcript.split())
        ai_metrics.record_request(
            route="voice",
            engine="",
            duration_ms=0.0,
            status="blocked_injection",
            prompt_tokens=prompt_tokens,
            client_ip=client_ip,
        )
        return VoiceChatResponse(reply=deflection)

    system_prompt = build_voice_system_instruction()

    # 3. High-resolution timing & LLM Dispatch
    start_time = time.perf_counter()
    res = await call_ai_engine(system_prompt=system_prompt, user_prompt=transcript, chat_history=request.history)
    duration_ms = (time.perf_counter() - start_time) * 1000.0

    if isinstance(res, tuple):
        if len(res) == 3:
            reply, engine_used, req_status = res
        elif len(res) == 2:
            reply, engine_used = res
            req_status = "success"
        else:
            reply = res[0]
            engine_used = "gemini"
            req_status = "success"
    else:
        reply = str(res)
        engine_used = "gemini"
        req_status = "success"

    prompt_tokens = max(1, int(len(transcript.split()) * 1.3))
    completion_tokens = max(1, int(len(reply.split()) * 1.3))

    ai_metrics.record_request(
        route="voice",
        engine=engine_used,
        duration_ms=duration_ms,
        status=req_status,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        client_ip=client_ip,
    )

    return VoiceChatResponse(reply=reply)
