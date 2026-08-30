import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://devops-react-render-portfolio.onrender.com";

export function isSpeechRecognitionSupported() {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

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

export function speakText(text, { onStart, onEnd, onError } = {}) {
  if (!isSpeechSynthesisSupported()) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  utterance.pitch = 1.0;

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

export function stopSpeaking() {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
