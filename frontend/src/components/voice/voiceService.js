import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://devops-react-render-portfolio.onrender.com";

// Module-level locked voice to guarantee the voice never randomly switches during the session
let lockedVoice = null;

export function isSpeechRecognitionSupported() {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

export function isSpeechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Finds and locks onto the most realistic, human-sounding voice available in the browser.
 * Uses a single consistent voice throughout the session so the voice never randomly switches.
 */
export function getBestVoice() {
  if (lockedVoice) return lockedVoice;
  if (!isSpeechSynthesisSupported()) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Prioritize premium, neural, and enhanced human-sounding voices
  const voicePreferences = [
    // 1. Microsoft Natural / Neural voices (Edge / Windows / Chrome) - highest fidelity human TTS
    /Guy Online \(Natural\)/i,
    /Christopher Online \(Natural\)/i,
    /Jenny Online \(Natural\)/i,
    /Aria Online \(Natural\)/i,
    /Online \(Natural\)/i,
    /Natural/i,

    // 2. Apple Enhanced & Siri voices (macOS / iOS) - high-definition sampled human voices
    /Daniel \(Enhanced\)/i,
    /Samantha \(Enhanced\)/i,
    /Rishi \(Enhanced\)/i,
    /Karen \(Enhanced\)/i,
    /Ava \(Premium\)/i,
    /Siri/i,
    /Enhanced/i,

    // 3. Google Natural voices (Chrome / Android)
    /Google US English/i,
    /Google UK English Male/i,
    /Google UK English Female/i,
    /Google/i,

    // 4. Clean standard English fallbacks
    /Daniel/i,
    /Samantha/i,
  ];

  for (const pattern of voicePreferences) {
    const match = voices.find((v) => pattern.test(v.name) && v.lang.startsWith("en"));
    if (match) {
      lockedVoice = match;
      return lockedVoice;
    }
  }

  // Fallback to first available English voice
  lockedVoice = voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
  return lockedVoice;
}

// Pre-initialize and cache the voice on load so the first speech turn doesn't fall back to robotic default
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  getBestVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    if (!lockedVoice) {
      getBestVoice();
    }
  };
}

/**
 * Prepares raw AI text for natural speech synthesis.
 * Strips markdown, symbols, emojis, and expands acronyms into smooth spoken English.
 */
export function prepareTextForSpeech(rawText) {
  if (!rawText) return "";

  return rawText
    // Remove markdown links but keep text: [Link text](url) -> Link text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove raw URLs
    .replace(/https?:\/\/\S+/gi, "")
    // Remove markdown formatting: **, *, _, `, #, ~
    .replace(/[\*_~`#]/g, "")
    // Remove list dashes and bullets
    .replace(/^[\s*->•]+\s*/gm, "")
    // Pronounce technical terms naturally
    .replace(/\bCI\/CD\b/gi, "C I C D")
    .replace(/\bFastAPI\b/gi, "Fast A P I")
    .replace(/\bDevOps\b/gi, "Dev Ops")
    .replace(/\bAWS\b/gi, "A W S")
    .replace(/\bEKS\b/gi, "E K S")
    .replace(/\bIaC\b/gi, "Infrastructure as Code")
    .replace(/\s&\s/g, " and ")
    // Remove emojis that cause robotic reading
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
    // Normalize punctuation pauses
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
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
      timeout: 35000,
    }
  );
  return response.data;
}

export function speakText(text, { onStart, onEnd, onError } = {}) {
  if (!isSpeechSynthesisSupported()) return;

  window.speechSynthesis.cancel();

  const spokenText = prepareTextForSpeech(text);
  const utterance = new SpeechSynthesisUtterance(spokenText);

  // Warm, conversational human speech cadence
  utterance.rate = 0.95;
  utterance.pitch = 1.0;

  const voice = getBestVoice();
  if (voice) {
    utterance.voice = voice;
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
