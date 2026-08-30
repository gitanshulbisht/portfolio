import React, { useState, useEffect } from "react";
import { MessageSquareCode, X } from "lucide-react";
import ChatWindow from "./ChatWindow";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOtherWidgetOpen = (e) => {
      if (e.detail !== "chat") {
        setIsOpen(false);
      }
    };
    window.addEventListener("ai-widget-opened", handleOtherWidgetOpen);
    return () => window.removeEventListener("ai-widget-opened", handleOtherWidgetOpen);
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            const next = !isOpen;
            setIsOpen(next);
            if (next) {
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
