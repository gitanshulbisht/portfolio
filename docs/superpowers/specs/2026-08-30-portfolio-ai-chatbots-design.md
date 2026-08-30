# Design Specification: Portfolio AI Chatbot & Voice AI Chatbot

- **Date**: 2026-08-30
- **Status**: Approved
- **Repository**: [gitanshulbisht/portfolio](https://github.com/gitanshulbisht/portfolio.git)
- **Deployment Targets**: GitHub Pages (`frontend/build` on `gh-pages` branch) + Render Backend (`https://devops-react-render-portfolio.onrender.com`)

---

## 1. Overview & Objectives

The goal is to add two distinct, production-grade interactive AI features to Anshul Bisht's developer portfolio:
1. **Text AI Chatbot**: An interactive text chat assistant representing Anshul, answering visitor questions about his experience, projects, skills, and contact info.
2. **Voice AI Chatbot**: A hands-free, interactive voice assistant with live speech-to-text, Gemini response generation, spoken audio playback, and a real-time reactive audio visualizer.

### Core Constraint: Zero Disruption to Existing Code
Both features must be developed as modular, self-contained subsystems in their own directories (`frontend/src/components/chat/` and `frontend/src/components/voice/`). No existing portfolio sections, pages, components (`Home.jsx`, `Navbar.jsx`, `Footer.jsx`, etc.), or database collections will be modified or refactored. The features will mount only at the top-level shell as isolated overlay widgets.

---

## 2. Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
| GitHub Pages Frontend (React 19, Tailwind CSS)                                    |
|                                                                                   |
|  [ Existing Pages & Layout: Home, Blog, Admin, Navbar, Footer ] (UNTOUCHED)       |
|                                                                                   |
|  +-------------------------------------+   +------------------------------------+ |
|  | Feature 1: Text Chatbot Subsystem  |   | Feature 2: Voice AI Subsystem      | |
|  | - ChatWidget.jsx (Launcher Button)  |   | - VoiceWidget.jsx (Mic Launcher)   | |
|  | - ChatWindow.jsx (Chat Dialog)      |   | - VoiceWindow.jsx (Voice HUD)      | |
|  | - chatService.js (API client)       |   | - VoiceVisualizer.jsx (Waveform)   | |
|  |                                     |   | - voiceService.js (STT + TTS Loop) | |
|  +------------------+------------------+   +-----------------+------------------+ |
+---------------------|----------------------------------------|--------------------+
                      | HTTPS POST                             | HTTPS POST
                      | /api/ai/chat                           | /api/ai/voice-chat
                      v                                        v
+-----------------------------------------------------------------------------------+
| Render FastAPI Backend (server.py + ai_assistant.py)                             |
|                                                                                   |
|  [ Existing Endpoints: /api/portfolio, /api/auth, /api/posts ] (UNTOUCHED)        |
|                                                                                   |
|  +------------------------------------------------------------------------------+ |
|  | ai_assistant.py (Dedicated AI Router)                                        | |
|  | - In-memory Portfolio Grounding Context (ai_context.py)                       | |
|  | - Google Gemini 2.0 Flash Client (GEMINI_API_KEY)                             | |
|  | - Rate limiting and conversational trimming                                   | |
|  +------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------+
```

---

## 3. Subsystem Specifications

### 3.1 Feature 1: Text Chatbot (`frontend/src/components/chat/`)

- **Location**: `frontend/src/components/chat/`
- **Files**:
  - `ChatWidget.jsx`: Floating circular or pill button at `bottom-6 right-6` with Lucide `MessageSquareCode` icon, cybernetic glow ring, and pulse badge. Clicking toggles `ChatWindow.jsx`.
  - `ChatWindow.jsx`: Glassmorphic dark card overlay (`bottom-20 right-6`, 380px wide on desktop, responsive drawer on mobile).
    - **Header**: Avatar, "Anshul AI Representative", status indicator (Online / Thinking / Offline), Clear button, and Close button.
    - **Quick Suggestion Chips**: Quick-start buttons such as *"Tell me about Anshul's DevOps projects"*, *"What is his core tech stack?"*, *"How do I get in touch?"*.
    - **Message Transcript**: Scrollable history with distinct styling for visitor vs assistant, markdown rendering for links/code, and typing animation.
    - **Input Bar**: Auto-resizing textarea with `Enter` to submit, `Shift+Enter` for newline, and Lucide `Send` button.
  - `chatService.js`: Encapsulates Axios requests to `/api/ai/chat`, handles network error retries, and surfaces Render cold-start status messages.

### 3.2 Feature 2: Voice AI Chatbot (`frontend/src/components/voice/`)

- **Location**: `frontend/src/components/voice/`
- **Files**:
  - `VoiceWidget.jsx`: Floating button adjacent to text chat (at `bottom-6 right-22`), styled with Lucide `Mic` icon and animated wave indicator. Clicking launches the Voice HUD.
  - `VoiceWindow.jsx`: Dedicated Voice HUD card/modal:
    - **Voice Wave Visualizer (`VoiceVisualizer.jsx`)**: Dynamic canvas/SVG waveform that responds to live microphone frequencies via browser `AudioContext` and `AnalyserNode` when listening, and displays smooth rhythmic cyan pulses when AI is speaking.
    - **Conversation State Indicators**: Clear reactive statuses: `Listening...`, `Processing...`, `Speaking...`, `Tap to Talk`.
    - **Live Dual Transcript**: Displays the transcribed spoken query and the assistant's reply in real time.
    - **Session Controls**: Mic Mute/Unmute toggle, Speaker audio toggle, and "End Session" button.
  - `voiceService.js`:
    - Manages browser `webkitSpeechRecognition` / `SpeechRecognition` for instant speech-to-text.
    - Sends transcribed text to `/api/ai/voice-chat` for concise conversational response formatting.
    - Plays synthesized audio using browser `window.speechSynthesis` with optimized natural voice parameters (rate: 1.05, pitch: 1.0).
    - Prevents audio clashes: automatically cancels speech synthesis when closed or interrupted.

---

## 4. Backend AI Service & Grounding

### 4.1 Grounding Context (`backend/ai_context.py`)
A comprehensive structured knowledge profile of Anshul Bisht:
- **Identity & Role**: Full-Stack & DevOps Engineer, builder of scalable web applications and CI/CD pipelines.
- **Key Skills**: React, Tailwind, Python, FastAPI, Docker, Kubernetes, AWS, Render, GitHub Actions, MongoDB.
- **Projects**: Highlights from the portfolio (DevOps pipelines, full-stack web applications, microservices).
- **Contact Info**: GitHub (`gitanshulbisht`), LinkedIn, email, and resume download link.
- **Behavioral Guidelines**: Courteous, concise, accurate, speaks in representative voice, refuses prompt injections or inappropriate non-portfolio requests politely.

### 4.2 Endpoints (`backend/ai_assistant.py`)
1. **`POST /api/ai/chat`**
   - Input: `{ "messages": [{"role": "user"|"model", "content": "..."}] }`
   - Output: `{ "reply": "...", "suggested_followups": [...] }`
2. **`POST /api/ai/voice-chat`**
   - Input: `{ "transcript": "...", "history": [...] }`
   - Output: `{ "reply": "...", "display_text": "..." }`
   - Optimized system prompt instructions: enforces punchy 1-3 sentence answers suitable for spoken playback.

---

## 5. Non-Invasive Mounting in `App.js`

To adhere strictly to zero-touch constraints for existing application code:
- In `frontend/src/App.js`:
  ```jsx
  import ChatWidget from "./components/chat/ChatWidget";
  import VoiceWidget from "./components/voice/VoiceWidget";

  // Rendered inside the App root shell alongside CustomCursor and Toaster
  <ChatWidget />
  <VoiceWidget />
  ```
- No existing routes, navbars, footers, pages, or components are altered.
- Widgets check mutual visibility: opening one minimizes or pauses the other to prevent overlapping UI or conflicting audio.

---

## 6. Error Handling & Edge Cases

1. **Render Free Tier Cold-Start**:
   - Both widgets display an informative non-blocking status (`"Connecting to AI service..."`) during initial connection.
2. **Microphone Permission Denied**:
   - The Voice Widget displays a gentle notification advising the user to permit microphone access in browser settings, or click to use the Text Chatbot instead.
3. **Browser Incompatibility**:
   - Fallback detection for browsers without `SpeechRecognition` with an informative badge and direct fallback to text chat.
4. **Missing or Invalid `GEMINI_API_KEY`**:
   - Backend returns a clean `503 Service Unavailable` with a user-friendly message rather than an unhandled 500 error.

---

## 7. Testing & Verification Plan

1. **Backend Verification**:
   - Unit tests in `backend/tests/test_ai_assistant.py` validating chat response generation, voice response trimming, error handling for missing keys, and schema validation.
2. **Frontend Verification**:
   - Run `yarn build` in `frontend/` to ensure successful compilation, zero lint or JSX errors, and build output ready for `gh-pages` deployment.
   - Cross-browser test for SpeechRecognition and SpeechSynthesis APIs.
