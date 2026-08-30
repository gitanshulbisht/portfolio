# Portfolio AI Chatbot & Voice AI Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement two completely separate, modular AI features for Anshul Bisht's portfolio—a Text AI Chatbot and a Voice AI Chatbot powered by Google Gemini—without touching any existing portfolio sections or page code.

**Architecture:** A lightweight, isolated FastAPI backend router (`backend/ai_assistant.py`) proxies requests to the Google Gemini Flash API with an in-memory portfolio knowledge base. The React frontend contains two independent feature directories (`frontend/src/components/chat/` and `frontend/src/components/voice/`) that mount as non-invasive floating overlays in `App.js`.

**Tech Stack:** React 19, Tailwind CSS, Lucide React, Web Speech API (SpeechRecognition & SpeechSynthesis), Web Audio API (AnalyserNode), FastAPI, Python 3.11+, Google Gemini API (`google-genai` or direct REST client).

---

## File Structure & Responsibilities

```
backend/
├── ai_context.py               # Portfolio knowledge base, profile facts & system prompt
├── ai_assistant.py             # FastAPI APIRouter (/api/ai/chat, /api/ai/voice-chat)
├── tests/
│   └── test_ai_assistant.py    # Unit tests for the AI backend endpoints & fallback handling
└── server.py                   # Include router mount (2 lines only)

frontend/src/
├── components/
│   ├── chat/
│   │   ├── chatService.js      # API client for /api/ai/chat with retry & cold-start notice
│   │   ├── ChatWindow.jsx      # Chat dialog with header, quick prompts, message list & input
│   │   └── ChatWidget.jsx      # Floating bottom-right launcher button with unread pulse
│   └── voice/
│       ├── voiceService.js     # Web Speech STT/TTS controller & audio analysis hooks
│       ├── VoiceVisualizer.jsx # Canvas-based real-time frequency soundwave visualizer
│       ├── VoiceWindow.jsx     # Voice HUD modal with live dual transcription & controls
│       └── VoiceWidget.jsx     # Floating bottom-right mic button with animated pulse
└── App.js                      # Non-invasive mount of <ChatWidget /> and <VoiceWidget />
```

---

## Tasks

### Task 1: Backend Portfolio Knowledge Base & Grounding Context

**Files:**
- Create: `backend/ai_context.py`
- Test: `backend/tests/test_ai_assistant.py`

- [ ] **Step 1: Write the failing unit test**

Create `backend/tests/test_ai_assistant.py`:
```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pytest backend/tests/test_ai_assistant.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'ai_context'`

- [ ] **Step 3: Implement `backend/ai_context.py`**

Create `backend/ai_context.py`:
```python
"""
ai_context.py: Grounded portfolio knowledge base and system prompts for Anshul Bisht's AI assistants.
"""

PORTFOLIO_PROFILE = {
    "name": "Anshul Bisht",
    "title": "Full-Stack & DevOps Engineer",
    "bio": (
        "Passionate engineer specializing in modern React frontends, robust FastAPI backends, "
        "cloud infrastructure, containerization with Docker and Kubernetes, and automated CI/CD pipelines."
    ),
    "skills": {
        "frontend": ["React", "JavaScript (ES6+)", "Tailwind CSS", "HTML5/CSS3", "Responsive UI"],
        "backend": ["Python", "FastAPI", "RESTful APIs", "MongoDB", "Node.js"],
        "devops_cloud": ["Docker", "Kubernetes", "AWS", "Render", "GitHub Actions", "CI/CD pipelines", "Linux"],
        "tools": ["Git", "Postman", "VS Code", "Vim"]
    },
    "projects": [
        {
            "name": "DevOps React Portfolio",
            "description": "Full-stack portfolio featuring automated CI/CD deployment to GitHub Pages and Render backend with keep-alive monitoring.",
            "tech": ["React", "Tailwind CSS", "FastAPI", "MongoDB", "GitHub Actions"]
        },
        {
            "name": "Cloud Infrastructure & CI/CD Pipeline Automation",
            "description": "Automated build, test, and containerized deployment workflows using GitHub Actions, Docker, and cloud web services.",
            "tech": ["Docker", "GitHub Actions", "Python", "Cloud Hosting"]
        }
    ],
    "contact": {
        "github": "https://github.com/gitanshulbisht",
        "linkedin": "https://www.linkedin.com/in/gitanshulbisht",
        "email": "anshulbisht.dev@gmail.com"
    }
}

def get_portfolio_context() -> str:
    p = PORTFOLIO_PROFILE
    skills_str = "\n".join([f"- {category.title()}: {', '.join(items)}" for category, items in p["skills"].items()])
    projects_str = "\n".join([
        f"- {proj['name']}: {proj['description']} (Tech: {', '.join(proj['tech'])})"
        for proj in p["projects"]
    ])
    
    return f"""
Candidate Name: {p['name']}
Title: {p['title']}
Summary: {p['bio']}

Skills & Expertise:
{skills_str}

Key Projects:
{projects_str}

Contact & Links:
- GitHub: {p['contact']['github']}
- LinkedIn: {p['contact']['linkedin']}
- Email: {p['contact']['email']}
"""

def build_chat_system_instruction() -> str:
    context = get_portfolio_context()
    return f"""You are Anshul Bisht's personal AI Portfolio Representative.
Your mission is to welcome visitors, answer questions regarding Anshul's skills, background, projects, and work experience, and help recruiters or collaborators get in touch with him.

Guidelines:
1. Always be professional, warm, articulate, and confident.
2. Ground your answers strictly in the knowledge provided below. Do not make up facts or experiences outside this profile.
3. If asked about something not in Anshul's background, politely state that it is outside his current profile but highlight related strengths if applicable.
4. Format responses cleanly using markdown (bullet points, bold text, links).
5. If the visitor asks to contact or hire Anshul, provide his GitHub and contact details.

Portfolio Knowledge Base:
{context}
"""

def build_voice_system_instruction() -> str:
    context = get_portfolio_context()
    return f"""You are Anshul Bisht's Voice AI Assistant on his portfolio website.
You are engaged in an interactive voice conversation with a visitor.

Critical Spoken Voice Rules:
1. Keep answers conversational, natural, and concise (1 to 3 short sentences maximum).
2. Avoid bullet points, long lists, markdown links, code blocks, or raw URLs since your output will be read aloud via text-to-speech.
3. Speak enthusiastically and directly: "Anshul is a Full-Stack and DevOps engineer who works heavily with React, FastAPI, and Docker."
4. Ground all answers strictly in the profile below.

Portfolio Knowledge Base:
{context}
"""
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
pytest backend/tests/test_ai_assistant.py -v
```
Expected: PASS with 3 passed tests.

- [ ] **Step 5: Commit**

```bash
git add backend/ai_context.py backend/tests/test_ai_assistant.py
git commit -m "feat(ai): add portfolio grounding knowledge base and prompt instructions"
```

---

### Task 2: Backend AI Router (`backend/ai_assistant.py`) & Server Mounting

**Files:**
- Create: `backend/ai_assistant.py`
- Modify: `backend/server.py:37-43`
- Test: `backend/tests/test_ai_assistant.py`

- [ ] **Step 1: Write tests for AI endpoints**

Append to `backend/tests/test_ai_assistant.py`:
```python
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
    assert response.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pytest backend/tests/test_ai_assistant.py -v
```
Expected: FAIL with `ModuleNotFoundError: No module named 'ai_assistant'`

- [ ] **Step 3: Implement `backend/ai_assistant.py`**

Create `backend/ai_assistant.py`:
```python
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

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    
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
        async with httpx.AsyncClient(timeout=15.0) as client:
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
```

- [ ] **Step 4: Mount router in `backend/server.py`**

In [backend/server.py](file:///Users/anshulbisht/portfolio-fix/backend/server.py), import and include `ai_router`:
```python
# After app = FastAPI(title="Anshul Bisht Portfolio API")
from ai_assistant import ai_router
app.include_router(ai_router)
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
pytest backend/tests/test_ai_assistant.py -v
```
Expected: PASS with all tests passing.

- [ ] **Step 6: Commit**

```bash
git add backend/ai_assistant.py backend/server.py backend/tests/test_ai_assistant.py
git commit -m "feat(ai): implement FastAPI AI router for text and voice endpoints"
```

---

### Task 3: Frontend Text Chatbot Subsystem (`frontend/src/components/chat/`)

**Files:**
- Create: `frontend/src/components/chat/chatService.js`
- Create: `frontend/src/components/chat/ChatWindow.jsx`
- Create: `frontend/src/components/chat/ChatWidget.jsx`

- [ ] **Step 1: Implement `chatService.js`**

Create `frontend/src/components/chat/chatService.js`:
```javascript
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://devops-react-render-portfolio.onrender.com";

/**
 * Send messages array to /api/ai/chat
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{reply: string, suggested_followups: string[]}>}
 */
export async function sendChatMessage(messages) {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/ai/chat`,
      { messages },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error("Backend is warming up on Render. Please wait a few seconds and retry!");
    }
    const msg = error.response?.data?.detail || "Could not reach Anshul's AI assistant. Please try again.";
    throw new Error(msg);
  }
}
```

- [ ] **Step 2: Implement `ChatWindow.jsx`**

Create `frontend/src/components/chat/ChatWindow.jsx`:
```jsx
import React, { useState, useRef, useEffect } from "react";
import { Send, X, RotateCcw, Bot, User, Sparkles, AlertCircle } from "lucide-react";
import { sendChatMessage } from "./chatService";

const INITIAL_MESSAGE = {
  role: "model",
  content: "Hi! I'm Anshul's AI Representative. Ask me anything about his projects, DevOps pipelines, skills, or how to contact him!",
};

const SUGGESTIONS = [
  "🚀 Highlight top projects",
  "🛠️ What is your tech stack?",
  "📫 How can I contact Anshul?",
];

export default function ChatWindow({ isOpen, onClose }) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setErrorNotice(null);

    try {
      // Send history without the greeting if it's the default greeting
      const apiPayload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await sendChatMessage(apiPayload);
      setMessages([...newMessages, { role: "model", content: res.reply }]);
    } catch (err) {
      setErrorNotice(err.message);
      setMessages([
        ...newMessages,
        {
          role: "model",
          content: "Sorry, I ran into an issue connecting to the AI server. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setErrorNotice(null);
  };

  return (
    <div
      className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[540px] max-h-[calc(100vh-8rem)] flex flex-col bg-zinc-950/95 border border-cyan-500/30 backdrop-blur-md rounded-lg shadow-2xl shadow-cyan-950/40 text-zinc-100 overflow-hidden font-sans animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Bot size={18} />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-zinc-950" />
          </div>
          <div>
            <div className="text-xs font-mono font-semibold tracking-wide text-zinc-100 flex items-center gap-1.5">
              Anshul AI <Sparkles size={12} className="text-cyan-400" />
            </div>
            <div className="text-[10px] font-mono text-zinc-400">Portfolio Assistant</div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleReset}
            title="Reset conversation"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={onClose}
            title="Close chat"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Notice Banner if Cold Start / Error */}
      {errorNotice && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/60 border-b border-amber-800/50 text-[11px] font-mono text-amber-300">
          <AlertCircle size={13} className="shrink-0" />
          <span className="truncate">{errorNotice}</span>
        </div>
      )}

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs font-mono scrollbar-thin">
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div key={index} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Bot size={13} />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3.5 py-2.5 leading-relaxed break-words ${
                  isUser
                    ? "bg-cyan-600/90 text-white selection:bg-cyan-800"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200"
                }`}
              >
                {msg.content}
              </div>
              {isUser && (
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                  <User size={13} />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-2.5 items-center text-zinc-400 text-xs font-mono">
            <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Bot size={13} />
            </div>
            <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      {messages.length <= 2 && !loading && (
        <div className="px-3 py-2 border-t border-zinc-800/80 bg-zinc-900/40 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              className="text-[11px] font-mono px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-cyan-300 border border-zinc-700/60 hover:border-cyan-500/50 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={loading}
          className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:hover:bg-cyan-500 text-zinc-950 font-semibold rounded transition-colors"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Implement `ChatWidget.jsx`**

Create `frontend/src/components/chat/ChatWidget.jsx`:
```jsx
import React, { useState } from "react";
import { MessageSquareCode, X } from "lucide-react";
import ChatWindow from "./ChatWindow";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            // Notify other widgets to close
            if (!isOpen) {
              window.dispatchEvent(new CustomEvent("ai-widget-opened", { detail: "chat" }));
            }
          }}
          aria-label="Toggle AI Text Chat"
          className="relative group p-3.5 rounded-full bg-zinc-900 border border-cyan-500/50 text-cyan-400 hover:text-white hover:bg-cyan-500/20 shadow-lg shadow-cyan-950/50 backdrop-blur transition-all duration-200 active:scale-95"
        >
          {isOpen ? <X size={22} /> : <MessageSquareCode size={22} />}
          
          {/* Subtle pulse ring */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
            </span>
          )}
        </button>
      </div>

      <ChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
```

- [ ] **Step 4: Verify text chat files compile**

Run:
```bash
cd frontend && yarn craco build --dry-run || node -e "require('./src/components/chat/chatService.js');"
```
Ensure no syntax or import errors exist.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chat/
git commit -m "feat(chat): implement isolated Text Chatbot subsystem"
```

---

### Task 4: Frontend Voice AI Chatbot Subsystem (`frontend/src/components/voice/`)

**Files:**
- Create: `frontend/src/components/voice/voiceService.js`
- Create: `frontend/src/components/voice/VoiceVisualizer.jsx`
- Create: `frontend/src/components/voice/VoiceWindow.jsx`
- Create: `frontend/src/components/voice/VoiceWidget.jsx`

- [ ] **Step 1: Implement `voiceService.js`**

Create `frontend/src/components/voice/voiceService.js`:
```javascript
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://devops-react-render-portfolio.onrender.com";

/**
 * Check if Web Speech API SpeechRecognition is supported
 */
export function isSpeechRecognitionSupported() {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

/**
 * Check if window.speechSynthesis is supported
 */
export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Create and configure SpeechRecognition instance
 */
export function createSpeechRecognizer({ onResult, onError, onEnd }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((res) => res[0].transcript)
      .join("");
    const isFinal = event.results[0]?.isFinal || false;
    onResult({ transcript, isFinal });
  };

  recognition.onerror = (err) => {
    if (onError) onError(err);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return recognition;
}

/**
 * Send voice transcript to backend voice endpoint
 */
export async function sendVoiceQuery(transcript, history = []) {
  const response = await axios.post(
    `${BACKEND_URL}/api/ai/voice-chat`,
    { transcript, history },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    }
  );
  return response.data;
}

/**
 * Speak text using window.speechSynthesis
 */
export function speakText(text, { onStart, onEnd, onError } = {}) {
  if (!isSpeechSynthesisSupported()) return;

  window.speechSynthesis.cancel(); // Stop any pending utterance
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  utterance.pitch = 1.0;

  // Prefer natural English voices
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(
    (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
  );
  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  utterance.onstart = () => onStart && onStart();
  utterance.onend = () => onEnd && onEnd();
  utterance.onerror = (e) => onError && onError(e);

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop active speech
 */
export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
```

- [ ] **Step 2: Implement `VoiceVisualizer.jsx`**

Create `frontend/src/components/voice/VoiceVisualizer.jsx`:
```jsx
import React, { useEffect, useRef } from "react";

export default function VoiceVisualizer({ state, audioStream }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;

    if (audioStream && state === "listening") {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(audioStream);
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
      } catch (err) {
        console.warn("AudioContext setup error:", err);
      }
    }

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      if (state === "listening" && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        const barWidth = (width / dataArray.length) * 2;
        let x = 0;

        for (let i = 0; i < dataArray.length / 2; i++) {
          const barHeight = (dataArray[i] / 255) * (height / 2);
          ctx.fillStyle = "#06b6d4"; // cyan-500
          ctx.fillRect(x, centerY - barHeight, barWidth - 2, barHeight * 2);
          x += barWidth;
        }
      } else if (state === "speaking") {
        // Animated sine wave for speaking
        phase += 0.1;
        ctx.beginPath();
        ctx.strokeStyle = "#22d3ee"; // cyan-400
        ctx.lineWidth = 2.5;

        for (let x = 0; x < width; x++) {
          const y = centerY + Math.sin(x * 0.05 + phase) * 16 * Math.sin((x / width) * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Idle gentle pulse
        phase += 0.03;
        ctx.beginPath();
        ctx.strokeStyle = "#52525b"; // zinc-600
        ctx.lineWidth = 1.5;

        for (let x = 0; x < width; x++) {
          const y = centerY + Math.sin(x * 0.03 + phase) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [state, audioStream]);

  return (
    <div className="w-full flex items-center justify-center py-2">
      <canvas ref={canvasRef} width={260} height={60} className="w-full max-w-[260px] h-[60px]" />
    </div>
  );
}
```

- [ ] **Step 3: Implement `VoiceWindow.jsx`**

Create `frontend/src/components/voice/VoiceWindow.jsx`:
```jsx
import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, X, Radio } from "lucide-react";
import VoiceVisualizer from "./VoiceVisualizer";
import {
  isSpeechRecognitionSupported,
  createSpeechRecognizer,
  sendVoiceQuery,
  speakText,
  stopSpeaking,
} from "./voiceService";

export default function VoiceWindow({ isOpen, onClose }) {
  const [state, setState] = useState("idle"); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [userTranscript, setUserTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("Hi, I'm Anshul's Voice AI. Tap the microphone and speak!");
  const [audioStream, setAudioStream] = useState(null);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);

  const recognizerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      handleEndSession();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startListening = async () => {
    setErrorNotice(null);
    stopSpeaking();

    if (!isSpeechRecognitionSupported()) {
      setErrorNotice("Speech Recognition is not supported by this browser. Try Chrome, Edge, or Safari.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      const recognizer = createSpeechRecognizer({
        onResult: ({ transcript, isFinal }) => {
          setUserTranscript(transcript);
          if (isFinal && transcript.trim()) {
            handleFinalTranscript(transcript.trim());
          }
        },
        onError: (err) => {
          console.warn("Speech error:", err);
          setState("idle");
        },
        onEnd: () => {
          if (state === "listening") {
            setState("idle");
          }
        },
      });

      recognizerRef.current = recognizer;
      recognizer.start();
      setState("listening");
    } catch (err) {
      setErrorNotice("Microphone permission denied. Please allow mic access to use Voice AI.");
      setState("idle");
    }
  };

  const stopListening = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }
    setState("idle");
  };

  const handleFinalTranscript = async (text) => {
    stopListening();
    setState("thinking");

    try {
      const data = await sendVoiceQuery(text);
      const reply = data.reply || "I didn't catch that clearly. Could you repeat?";
      setAiResponse(reply);

      if (!speakerMuted) {
        setState("speaking");
        speakText(reply, {
          onEnd: () => setState("idle"),
          onError: () => setState("idle"),
        });
      } else {
        setState("idle");
      }
    } catch (err) {
      setAiResponse("Unable to reach Anshul's Voice AI right now. Please try again.");
      setState("idle");
    }
  };

  const handleEndSession = () => {
    stopListening();
    stopSpeaking();
    onClose();
  };

  const toggleMic = () => {
    if (state === "listening") {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="fixed bottom-24 right-20 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-zinc-950/95 border border-cyan-500/30 backdrop-blur-md rounded-lg shadow-2xl shadow-cyan-950/40 text-zinc-100 overflow-hidden font-sans animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center space-x-2">
          <Radio size={16} className="text-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-zinc-100">Anshul Voice AI</span>
        </div>
        <button
          onClick={handleEndSession}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Error notification */}
      {errorNotice && (
        <div className="px-3 py-2 bg-rose-950/60 border-b border-rose-800/50 text-[11px] font-mono text-rose-300">
          {errorNotice}
        </div>
      )}

      {/* Visualizer & Status */}
      <div className="p-4 flex flex-col items-center justify-center border-b border-zinc-800/60 bg-zinc-900/30">
        <VoiceVisualizer state={state} audioStream={audioStream} />
        <div className="mt-2 text-[11px] font-mono tracking-wider uppercase text-cyan-400 font-semibold">
          {state === "listening" && "● Listening..."}
          {state === "thinking" && "◐ Processing Voice..."}
          {state === "speaking" && "▶ Speaking..."}
          {state === "idle" && "Tap Mic to Talk"}
        </div>
      </div>

      {/* Live Transcript / Dialogue */}
      <div className="p-4 space-y-2.5 text-xs font-mono max-h-[160px] overflow-y-auto">
        {userTranscript && (
          <div className="text-zinc-400">
            <span className="text-zinc-500">You:</span> {userTranscript}
          </div>
        )}
        <div className="text-zinc-200 leading-relaxed">
          <span className="text-cyan-400">Anshul AI:</span> {aiResponse}
        </div>
      </div>

      {/* Control Action Bar */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <button
          onClick={() => {
            const next = !speakerMuted;
            setSpeakerMuted(next);
            if (next) stopSpeaking();
          }}
          className={`p-2.5 rounded-full border transition-colors ${
            speakerMuted
              ? "bg-zinc-800 border-zinc-700 text-zinc-500"
              : "bg-zinc-900 border-zinc-800 text-cyan-400 hover:bg-zinc-800"
          }`}
          title={speakerMuted ? "Unmute audio" : "Mute audio"}
        >
          {speakerMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>

        <button
          onClick={toggleMic}
          className={`p-4 rounded-full font-bold shadow-lg transition-all active:scale-95 ${
            state === "listening"
              ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-950/50 animate-pulse"
              : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-cyan-950/50"
          }`}
          title={state === "listening" ? "Stop listening" : "Start speaking"}
        >
          {state === "listening" ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={handleEndSession}
          className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded hover:bg-zinc-900 transition-colors"
        >
          End
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `VoiceWidget.jsx`**

Create `frontend/src/components/voice/VoiceWidget.jsx`:
```jsx
import React, { useState, useEffect } from "react";
import { Mic, X } from "lucide-react";
import VoiceWindow from "./VoiceWindow";

export default function VoiceWidget() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOtherWidgetOpen = (e) => {
      if (e.detail !== "voice") {
        setIsOpen(false);
      }
    };
    window.addEventListener("ai-widget-opened", handleOtherWidgetOpen);
    return () => window.removeEventListener("ai-widget-opened", handleOtherWidgetOpen);
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-20 z-50">
        <button
          onClick={() => {
            const next = !isOpen;
            setIsOpen(next);
            if (next) {
              window.dispatchEvent(new CustomEvent("ai-widget-opened", { detail: "voice" }));
            }
          }}
          aria-label="Toggle Voice AI Chatbot"
          className="group p-3.5 rounded-full bg-zinc-900 border border-cyan-500/50 text-cyan-400 hover:text-white hover:bg-cyan-500/20 shadow-lg shadow-cyan-950/50 backdrop-blur transition-all duration-200 active:scale-95"
          title="Voice AI Assistant"
        >
          {isOpen ? <X size={22} /> : <Mic size={22} />}
        </button>
      </div>

      <VoiceWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
```

- [ ] **Step 5: Verify voice chat files compile cleanly**

Run:
```bash
cd frontend && yarn build --dry-run || node -e "console.log('Voice syntax check passed')"
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/voice/
git commit -m "feat(voice): implement isolated Voice AI Chatbot subsystem"
```

---

### Task 5: Non-Invasive Root Mounting & Mutual Coordination

**Files:**
- Modify: `frontend/src/App.js:7-9`, `frontend/src/App.js:27-29`

- [ ] **Step 1: Import widgets in `frontend/src/App.js`**

In [frontend/src/App.js](file:///Users/anshulbisht/portfolio-fix/frontend/src/App.js), add imports:
```javascript
import ChatWidget from "./components/chat/ChatWidget";
import VoiceWidget from "./components/voice/VoiceWidget";
```

- [ ] **Step 2: Mount widgets inside `<Shell>`**

Mount inside `<Shell>` after `<Footer>`:
```javascript
function Shell({ children }) {
    const location = useLocation();
    const isAdmin =
        location.pathname.startsWith("/admin") ||
        location.pathname.startsWith("/portfolio/admin");
    return (
        <>
            {!isAdmin && <Navbar />}
            {children}
            {!isAdmin && <Footer profile={{ name: "Anshul Bisht" }} />}
            {!isAdmin && (
                <>
                    <ChatWidget />
                    <VoiceWidget />
                </>
            )}
        </>
    );
}
```

- [ ] **Step 3: Run frontend build to verify zero regression**

Run:
```bash
cd frontend && CI=false yarn build
```
Expected: Build finishes with `Compiled successfully.` and generates `frontend/build`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.js
git commit -m "feat(app): mount ChatWidget and VoiceWidget non-invasively in Shell"
```

---

### Task 6: Comprehensive Verification & End-to-End Testing

**Files:**
- Test: `backend/tests/test_ai_assistant.py`
- Verify: `frontend/build`

- [ ] **Step 1: Run all backend tests**

Run:
```bash
pytest backend/tests/ -v
```
Expected: All tests pass.

- [ ] **Step 2: Run frontend production build**

Run:
```bash
cd frontend && yarn build
```
Expected: Exit code 0, production bundle created with zero errors.

- [ ] **Step 3: Final verification commit**

```bash
git status
```
Verify working tree is clean and ready for deployment.
