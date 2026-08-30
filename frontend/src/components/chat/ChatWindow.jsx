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
                className={`max-w-[80%] rounded-lg px-3.5 py-2.5 leading-relaxed break-words whitespace-pre-wrap ${
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
