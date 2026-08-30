import React, { useState, useEffect } from "react";
import { api, formatApiErrorDetail } from "../../lib/api";
import { toast } from "sonner";
import { Zap, Cpu, Bot, CheckCircle2, Sparkles, ShieldCheck, RefreshCw } from "lucide-react";

export default function AISettingsPanel() {
  const [provider, setProvider] = useState("auto");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groqConfigured, setGroqConfigured] = useState(false);
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);

  // Live Test State
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/ai-settings");
      setProvider(data.provider || "auto");
      setGroqConfigured(Boolean(data.groq_configured));
      setGeminiConfigured(Boolean(data.gemini_configured));
      setUpdatedAt(data.updated_at);
      setUpdatedBy(data.updated_by);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to load AI settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (chosenProvider = provider) => {
    setSaving(true);
    try {
      const { data } = await api.put("/admin/ai-settings", { provider: chosenProvider });
      setProvider(data.provider);
      toast.success(`Active AI engine switched to ${data.provider.toUpperCase()} successfully!`);
      loadSettings();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to update AI settings");
    } finally {
      setSaving(false);
    }
  };

  const handleLiveTest = async () => {
    setTesting(true);
    setTestResult(null);
    const startTime = performance.now();
    try {
      const { data } = await api.post("/ai/chat", {
        messages: [{ role: "user", content: "Briefly explain Anshul's DevOps expertise in one sentence." }],
      });
      const elapsed = Math.round(performance.now() - startTime);
      setTestResult({
        reply: data.reply,
        timeMs: elapsed,
        success: true,
      });
      toast.success(`Test response received in ${elapsed}ms!`);
    } catch (e) {
      const elapsed = Math.round(performance.now() - startTime);
      setTestResult({
        error: formatApiErrorDetail(e.response?.data?.detail) || "Error testing AI endpoint",
        timeMs: elapsed,
        success: false,
      });
      toast.error("Test query failed. Check backend logs.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500 font-mono text-xs">
        <RefreshCw className="animate-spin mr-2" size={14} /> Loading AI Engine Settings...
      </div>
    );
  }

  const options = [
    {
      id: "auto",
      name: "Auto (Groq Primary + Gemini Fallback)",
      badge: "Recommended",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: Zap,
      speed: "~300ms",
      quota: "14,400 + 500 req/day",
      description:
        "Routes incoming chat and voice conversations to Groq for sub-second, human-like speed. Automatically fails over to Google Gemini if Groq encounters any rate limit or network downtime.",
      features: [
        "Zero downtime failover",
        "Sub-second voice and chat speed",
        "14,400 free requests per day on Groq",
      ],
    },
    {
      id: "groq",
      name: "Groq LPU Engine",
      badge: "Ultra-Fast (14,400/day)",
      badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      icon: Cpu,
      speed: "~300 - 450ms",
      quota: "14,400 free req/day",
      description:
        "Directly powers the AI chatbots using Groq's ultra-low latency Language Processing Units (Qwen 3.8 / GPT-OSS 120B). Ideal for instantaneous voice conversations.",
      features: [
        "14,400 free requests per day",
        "30 requests per minute quota",
        "Ultra-low latency for realistic voice response",
      ],
    },
    {
      id: "gemini",
      name: "Google Gemini",
      badge: "500 req/day",
      badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      icon: Sparkles,
      speed: "~1.5 - 3.0s",
      quota: "500 free req/day",
      description:
        "Directly powers the chatbots using Google Generative Language API (Gemini 3.5 Flash Lite). Deep reasoning capability backed by Google's cloud infrastructure.",
      features: [
        "500 free requests per day",
        "15 requests per minute quota",
        "Native Google Generative AI integration",
      ],
    },
  ];

  return (
    <div className="space-y-8 font-mono">
      {/* Header & Status */}
      <div className="border border-white/[0.08] bg-zinc-950/60 p-6 rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Bot className="text-cyan-400" size={18} />
              AI Chatbot Engine Switcher
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Switch the active LLM provider powering both your text chat and spoken voice assistant in real-time.
            </p>
          </div>

          {/* Connection Status Badges */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div
              className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                groqConfigured
                  ? "bg-cyan-950/50 border-cyan-500/40 text-cyan-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${groqConfigured ? "bg-cyan-400 animate-pulse" : "bg-zinc-600"}`} />
              Groq API: {groqConfigured ? "Connected" : "Not Set"}
            </div>
            <div
              className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                geminiConfigured
                  ? "bg-purple-950/50 border-purple-500/40 text-purple-300"
                  : "bg-zinc-900 border-zinc-700 text-zinc-500"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${geminiConfigured ? "bg-purple-400 animate-pulse" : "bg-zinc-600"}`} />
              Gemini API: {geminiConfigured ? "Connected" : "Not Set"}
            </div>
          </div>
        </div>

        {updatedAt && (
          <div className="mt-4 pt-4 border-t border-zinc-800/80 text-[10px] text-zinc-500 flex items-center justify-between">
            <span>Last updated: {new Date(updatedAt).toLocaleString()}</span>
            {updatedBy && <span>Updated by: {updatedBy}</span>}
          </div>
        )}
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = provider === opt.id;

          return (
            <div
              key={opt.id}
              onClick={() => setProvider(opt.id)}
              className={`relative cursor-pointer rounded-lg p-5 border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? "bg-cyan-950/30 border-cyan-500 shadow-lg shadow-cyan-950/50"
                  : "bg-zinc-950/60 border-white/[0.08] hover:border-zinc-700 hover:bg-zinc-900/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-2 rounded border ${
                        isSelected
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">{opt.name}</span>
                  </div>
                  {isSelected && <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />}
                </div>

                <div className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold border mb-3 tracking-wider uppercase">
                  <span className={opt.badgeColor}>{opt.badge}</span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed mb-4">{opt.description}</p>

                <div className="space-y-1.5 text-[11px] border-t border-zinc-800/60 pt-3">
                  <div className="flex justify-between text-zinc-400">
                    <span>Response Latency:</span>
                    <span className="text-zinc-200 font-semibold">{opt.speed}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Daily Quota:</span>
                    <span className="text-emerald-400 font-semibold">{opt.quota}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-zinc-800/60">
                <button
                  type="button"
                  disabled={saving}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave(opt.id);
                  }}
                  className={`w-full py-2 px-3 text-xs font-semibold rounded uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? "bg-cyan-500 hover:bg-cyan-400 text-zinc-950"
                      : "border border-white/10 hover:border-cyan-500 text-zinc-300 hover:text-cyan-400"
                  }`}
                >
                  {isSelected ? "Active Engine" : "Switch to This"}
                  {isSelected && <ShieldCheck size={13} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Action & Live Test Bench */}
      <div className="border border-white/[0.08] bg-zinc-950/60 p-6 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-white">Selected Provider: <span className="text-cyan-400 uppercase">{provider}</span></div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Click 'Save Engine Settings' to apply this configuration across all visitor sessions.</div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleLiveTest}
            disabled={testing}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-mono border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white rounded transition-colors"
          >
            {testing ? <RefreshCw className="animate-spin" size={13} /> : <Zap size={13} className="text-amber-400" />}
            {testing ? "Testing Query..." : "Run Test Query"}
          </button>

          <button
            onClick={() => handleSave(provider)}
            disabled={saving}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded uppercase tracking-wider transition-colors"
          >
            {saving ? <RefreshCw className="animate-spin" size={13} /> : <CheckCircle2 size={14} />}
            {saving ? "Saving..." : "Save Engine Settings"}
          </button>
        </div>
      </div>

      {/* Test Query Result Panel */}
      {testResult && (
        <div className="border border-zinc-800 bg-zinc-900/60 p-4 rounded-lg text-xs font-mono space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-2 border-b border-zinc-800">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Sparkles size={13} className="text-cyan-400" />
              Live Test Output
            </span>
            <span className="text-emerald-400 font-semibold">{testResult.timeMs}ms response time</span>
          </div>
          {testResult.success ? (
            <div className="text-zinc-200 leading-relaxed pt-1">{testResult.reply}</div>
          ) : (
            <div className="text-rose-400 pt-1">{testResult.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
