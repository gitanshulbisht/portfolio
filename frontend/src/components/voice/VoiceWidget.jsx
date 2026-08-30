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
      <div className="fixed bottom-5 sm:bottom-6 right-16 sm:right-20 z-50">
        <button
          onClick={() => {
            const next = !isOpen;
            setIsOpen(next);
            if (next) {
              window.dispatchEvent(new CustomEvent("ai-widget-opened", { detail: "voice" }));
            }
          }}
          aria-label="Toggle Voice AI Chatbot"
          aria-expanded={isOpen}
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
