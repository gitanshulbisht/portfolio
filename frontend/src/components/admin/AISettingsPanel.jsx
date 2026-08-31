import React, { useState, useEffect, useCallback } from "react";
import { api, formatApiErrorDetail } from "../../lib/api";
import { toast } from "sonner";
import {
  Zap,
  Cpu,
  Bot,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Activity,
  Clock,
  Database,
  Trash2,
  Radio,
  ExternalLink,
  Layers,
  AlertTriangle,
} from "lucide-react";

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

  // SRE Telemetry Metrics State
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [resettingMetrics, setResettingMetrics] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastMetricsFetch, setLastMetricsFetch] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/ai-settings");
      setProvider(data.provider || "auto");
      setGroqConfigured(Boolean(data.groq_configured));
      setGeminiConfigured(Boolean(data.gemini_configured));
      setUpdatedAt(data.updated_at);
      setUpdatedBy(data.updated_by);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to load AI settings");
    }
  }, []);

  const loadMetrics = useCallback(async (isSilent = false) => {
    if (!isSilent) setMetricsLoading(true);
    try {
      const { data } = await api.get("/admin/ai-metrics");
      setMetrics(data);
      setLastMetricsFetch(new Date());
    } catch (e) {
      if (!isSilent) {
        toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to load AI telemetry metrics");
      }
    } finally {
      if (!isSilent) setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    Promise.allSettled([loadSettings(), loadMetrics(true)]).then(() => {
      if (isMounted) setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [loadSettings, loadMetrics]);

  // Auto-refresh metrics every 8 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadMetrics(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadMetrics]);

  const handleSave = async (chosenProvider = provider) => {
    setSaving(true);
    try {
      const { data } = await api.put("/admin/ai-settings", { provider: chosenProvider });
      setProvider(data.provider);
      toast.success(`Active AI engine switched to ${data.provider.toUpperCase()} successfully!`);
      await loadSettings();
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
      // Immediately refresh SRE telemetry so the test span appears in the HUD
      loadMetrics(true);
    }
  };

  const handleResetMetrics = async () => {
    if (!window.confirm("Are you sure you want to reset all rolling SRE telemetry metrics and latency buffers?")) {
      return;
    }
    setResettingMetrics(true);
    try {
      const { data } = await api.post("/admin/ai-metrics/reset");
      toast.success(data.message || "AI telemetry metrics reset successfully!");
      await loadMetrics(true);
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Failed to reset telemetry metrics");
    } finally {
      setResettingMetrics(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500 font-mono text-xs">
        <RefreshCw className="animate-spin mr-2" size={14} /> Loading AI Engine Settings & Telemetry...
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

  // Telemetry aggregates & calculations
  const totalReq = metrics?.total_requests || 0;
  const successCount = metrics?.success_count || 0;
  const fallbackCount = metrics?.fallback_count || 0;
  const rateLimitedCount = metrics?.rate_limited_count || 0;
  const blockedInjectionCount = metrics?.blocked_injection_count || 0;
  const groqCount = metrics?.engine_distribution?.groq || 0;
  const geminiCount = metrics?.engine_distribution?.gemini || 0;
  const totalEngineCount = groqCount + geminiCount;
  const groqPct = totalEngineCount > 0 ? Math.round((groqCount / totalEngineCount) * 100) : 0;
  const geminiPct = totalEngineCount > 0 ? Math.round((geminiCount / totalEngineCount) * 100) : 0;
  const promptTokens = metrics?.tokens?.prompt || 0;
  const completionTokens = metrics?.tokens?.completion || 0;
  const totalTokens = metrics?.tokens?.total || 0;
  const latency = metrics?.latency_ms || { avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  const recentSpans = metrics?.recent_spans || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case "success":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Success
          </span>
        );
      case "fallback":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-950/60 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Fallback
          </span>
        );
      case "rate_limited":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-orange-950/60 text-orange-400 border border-orange-500/30 flex items-center gap-1">
            <AlertTriangle size={10} />
            Rate Limit
          </span>
        );
      case "blocked_injection":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-rose-950/60 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <ShieldAlert size={10} />
            Deflected
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-900 text-zinc-400 border border-zinc-700">
            {status}
          </span>
        );
    }
  };

  const formatLatencyColor = (val) => {
    if (val === 0) return "text-zinc-500";
    if (val < 500) return "text-cyan-400";
    if (val < 1500) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div data-testid="ai-settings-panel" className="space-y-8 font-mono">
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
          <div className="text-xs font-semibold text-white">
            Selected Provider: <span className="text-cyan-400 uppercase">{provider}</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Click 'Save Engine Settings' to apply this configuration across all visitor sessions.
          </div>
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

      {/* ========================================================================= */}
      {/* SRE Observability & Telemetry HUD */}
      {/* ========================================================================= */}
      <div data-testid="sre-metrics-section" className="space-y-6 pt-4 border-t border-zinc-800/80">
        {/* SRE Header & Control Bar */}
        <div className="border border-white/[0.08] bg-zinc-950/80 p-6 rounded-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Activity size={18} />
                </div>
                <h3 className="text-base font-semibold text-white tracking-wide">
                  SRE AI Telemetry & Observability HUD
                </h3>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border bg-cyan-950/40 text-cyan-400 border-cyan-500/30">
                  Real-Time
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5">
                Live inference latency percentiles, throughput distribution, guardrail deflections, and OpenMetrics Prometheus telemetry.
              </p>
            </div>

            {/* SRE Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Prometheus Exposition Link */}
              <a
                href="/metrics"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
                title="View OpenMetrics / Prometheus exposition"
              >
                <span>/metrics</span>
                <ExternalLink size={11} />
              </a>

              {/* Auto Refresh Toggle */}
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded border transition-colors ${
                  autoRefresh
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"
                  }`}
                />
                Auto: {autoRefresh ? "8s" : "Off"}
              </button>

              {/* Manual Refresh Button */}
              <button
                type="button"
                data-testid="refresh-metrics-btn"
                disabled={metricsLoading}
                onClick={() => loadMetrics(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-colors"
              >
                <RefreshCw className={metricsLoading ? "animate-spin text-cyan-400" : ""} size={12} />
                Refresh
              </button>

              {/* Reset Telemetry Button */}
              <button
                type="button"
                data-testid="reset-metrics-btn"
                disabled={resettingMetrics}
                onClick={handleResetMetrics}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded border border-rose-500/30 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 hover:text-rose-200 transition-colors"
              >
                {resettingMetrics ? <RefreshCw className="animate-spin" size={12} /> : <Trash2 size={12} />}
                Reset Telemetry
              </button>
            </div>
          </div>

          {lastMetricsFetch && (
            <div className="mt-3 pt-3 border-t border-zinc-800/60 text-[10px] text-zinc-500 flex items-center justify-between">
              <span>Telemetry sync: {lastMetricsFetch.toLocaleTimeString()}</span>
              <span>Buffer capacity: 200 rolling spans</span>
            </div>
          )}
        </div>

        {/* Key Metrics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Total AI Requests & Breakdown */}
          <div className="border border-white/[0.08] bg-zinc-950/60 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Total Requests</span>
                <Activity size={15} className="text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {totalReq.toLocaleString()}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Success:</span>
                <span className="text-emerald-400 font-semibold">{successCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Fallbacks:</span>
                <span className="text-amber-400 font-semibold">{fallbackCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Reliability:</span>
                <span className="text-cyan-300 font-semibold">
                  {totalReq > 0 ? ((successCount / totalReq) * 100).toFixed(1) : "100"}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Latency HUD (Average, P50, P90, P95) */}
          <div className="border border-white/[0.08] bg-zinc-950/60 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold">P95 Latency</span>
                <Clock size={15} className="text-amber-400" />
              </div>
              <div className={`text-2xl font-bold tracking-tight ${formatLatencyColor(latency.p95)}`}>
                {latency.p95} <span className="text-xs text-zinc-500 font-normal">ms</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Average:</span>
                <span className={`font-semibold ${formatLatencyColor(latency.avg)}`}>{latency.avg}ms</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>P50 (Median):</span>
                <span className={`font-semibold ${formatLatencyColor(latency.p50)}`}>{latency.p50}ms</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>P90:</span>
                <span className={`font-semibold ${formatLatencyColor(latency.p90)}`}>{latency.p90}ms</span>
              </div>
            </div>
          </div>

          {/* Card 3: Engine Distribution */}
          <div className="border border-white/[0.08] bg-zinc-950/60 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Engine Split</span>
                <Cpu size={15} className="text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight flex items-baseline gap-2">
                <span>{groqPct}%</span>
                <span className="text-xs text-zinc-500 font-normal">Groq Share</span>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${groqPct}%` }}
                  className="bg-cyan-500 h-full transition-all duration-300"
                  title={`Groq: ${groqCount} (${groqPct}%)`}
                />
                <div
                  style={{ width: `${geminiPct}%` }}
                  className="bg-purple-500 h-full transition-all duration-300"
                  title={`Gemini: ${geminiCount} (${geminiPct}%)`}
                />
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="flex items-center gap-1 text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Groq:
                </span>
                <span className="text-zinc-200 font-semibold">{groqCount} ({groqPct}%)</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span className="flex items-center gap-1 text-purple-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Gemini:
                </span>
                <span className="text-zinc-200 font-semibold">{geminiCount} ({geminiPct}%)</span>
              </div>
            </div>
          </div>

          {/* Card 4: Security Guardrails */}
          <div className="border border-white/[0.08] bg-zinc-950/60 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Guardrails HUD</span>
                <ShieldAlert size={15} className="text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {(blockedInjectionCount + rateLimitedCount).toLocaleString()}
                <span className="text-xs text-zinc-500 font-normal ml-1.5">deflected</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Injections Blocked:</span>
                <span className={blockedInjectionCount > 0 ? "text-rose-400 font-semibold" : "text-zinc-500"}>
                  {blockedInjectionCount}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Rate Limits Hit:</span>
                <span className={rateLimitedCount > 0 ? "text-orange-400 font-semibold" : "text-zinc-500"}>
                  {rateLimitedCount}
                </span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Protection Status:</span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </div>
            </div>
          </div>

          {/* Card 5: Tokens Processed */}
          <div className="border border-white/[0.08] bg-zinc-950/60 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-zinc-400 mb-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Tokens Processed</span>
                <Database size={15} className="text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {totalTokens.toLocaleString()}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-zinc-400">
                <span>Prompt Tokens:</span>
                <span className="text-zinc-200 font-semibold">{promptTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Completion Tokens:</span>
                <span className="text-zinc-200 font-semibold">{completionTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Avg / Request:</span>
                <span className="text-emerald-400 font-semibold">
                  {totalReq > 0 ? Math.round(totalTokens / totalReq) : 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Request Telemetry Table / Spans list */}
        <div className="border border-white/[0.08] bg-zinc-950/60 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                Recent Invocations & Trace Spans
              </h4>
              <span className="px-2 py-0.5 text-[10px] rounded border border-zinc-800 bg-zinc-900 text-zinc-400">
                {recentSpans.length} recent
              </span>
            </div>
            <span className="text-[11px] text-zinc-500">
              Capturing sub-second duration, token consumption, and engine failover
            </span>
          </div>

          {recentSpans.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono">
              No recent invocation spans recorded in active buffer. Run a live test query or chat with the assistant to generate telemetry.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 text-[11px]">
                    <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-4 font-semibold">Route</th>
                    <th className="py-2.5 px-4 font-semibold">Engine</th>
                    <th className="py-2.5 px-4 font-semibold">Latency</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold">Tokens</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {recentSpans.map((span, idx) => {
                    const dateStr = span.timestamp
                      ? new Date(span.timestamp * 1000).toLocaleTimeString()
                      : "—";

                    return (
                      <tr
                        key={`${span.timestamp}-${idx}`}
                        className="hover:bg-zinc-900/50 transition-colors text-[11px]"
                      >
                        {/* Timestamp */}
                        <td className="py-2.5 px-4 text-zinc-400 whitespace-nowrap">
                          {dateStr}
                        </td>

                        {/* Route */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${
                              span.route === "voice"
                                ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                                : "bg-cyan-950/40 text-cyan-300 border-cyan-500/30"
                            }`}
                          >
                            {span.route === "voice" ? <Radio size={10} /> : <Bot size={10} />}
                            {span.route || "chat"}
                          </span>
                        </td>

                        {/* Engine */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              span.engine === "groq"
                                ? "bg-cyan-950/50 text-cyan-400 border-cyan-500/40"
                                : span.engine === "gemini"
                                ? "bg-purple-950/50 text-purple-400 border-purple-500/40"
                                : "bg-zinc-900 text-zinc-500 border-zinc-800"
                            }`}
                          >
                            {span.engine || "none"}
                          </span>
                        </td>

                        {/* Latency */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`font-semibold ${formatLatencyColor(span.duration_ms)}`}>
                            {span.duration_ms}ms
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {getStatusBadge(span.status)}
                        </td>

                        {/* Tokens */}
                        <td className="py-2.5 px-4 text-zinc-300 whitespace-nowrap">
                          {span.tokens ? span.tokens.toLocaleString() : "—"}
                        </td>

                        {/* Client IP */}
                        <td className="py-2.5 px-4 text-right text-zinc-500 whitespace-nowrap">
                          {span.client_ip || "local"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

