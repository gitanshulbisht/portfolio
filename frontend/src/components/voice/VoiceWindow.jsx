import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const streamRef = useRef(null);

  const stopListening = useCallback(() => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.abort();
      } catch (e) {
        // Safe catch on already aborted recognizer
      }
      recognizerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setAudioStream(null);
    setState("idle");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      stopSpeaking();
    };
  }, [stopListening]);

  // Handle visibility changes without redundant onClose trigger
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      stopSpeaking();
    }
  }, [isOpen, stopListening]);

  if (!isOpen) return null;

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

  const startListening = async () => {
    setErrorNotice(null);
    stopSpeaking();

    if (!isSpeechRecognitionSupported()) {
      setErrorNotice("Speech Recognition is not supported by this browser. Try Chrome, Edge, or Safari.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
          stopListening();
        },
        onEnd: () => {
          stopListening();
        },
      });

      recognizerRef.current = recognizer;
      recognizer.start();
      setState("listening");
    } catch (err) {
      setErrorNotice("Microphone permission denied. Please allow mic access to use Voice AI.");
      stopListening();
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
    <div className="fixed bottom-24 right-4 sm:right-20 z-50 w-[340px] max-w-[calc(100vw-2rem)] bg-zinc-950/95 border border-cyan-500/30 backdrop-blur-md rounded-lg shadow-2xl shadow-cyan-950/40 text-zinc-100 overflow-hidden font-sans animate-in fade-in slide-in-from-bottom-5 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
        <div className="flex items-center space-x-2">
          <Radio size={16} className="text-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-zinc-100">Anshul Voice AI</span>
        </div>
        <button
          onClick={handleEndSession}
          aria-label="Close Voice AI"
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
      <div
        role="log"
        aria-live="polite"
        className="p-4 space-y-2.5 text-xs font-mono max-h-[160px] overflow-y-auto whitespace-pre-wrap"
      >
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
          aria-label={speakerMuted ? "Unmute audio" : "Mute audio"}
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
          aria-label={state === "listening" ? "Stop listening" : "Start speaking"}
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
          aria-label="End session"
          className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded hover:bg-zinc-900 transition-colors"
        >
          End
        </button>
      </div>
    </div>
  );
}
