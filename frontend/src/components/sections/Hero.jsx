import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";

const LINES = [
    { prompt: "whoami", out: "anshul.bisht — AWS DevOps & SRE" },
    { prompt: "uptime", out: "7+ years in production cloud ops" },
    { prompt: "ls ./skills", out: "AWS · EKS · Terraform · Argo CD · Prometheus" },
    { prompt: "echo $MISSION", out: "Ship reliable infra. Cut cost. Sleep at night." },
];

function Typewriter({ text, speed = 22, onDone }) {
    const [i, setI] = useState(0);
    useEffect(() => {
        if (i >= text.length) {
            onDone && onDone();
            return;
        }
        const t = setTimeout(() => setI(i + 1), speed);
        return () => clearTimeout(t);
    }, [i, text, speed, onDone]);
    return <span>{text.slice(0, i)}</span>;
}

const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
};

export default function Hero({ profile }) {
    const [step, setStep] = useState(0);

    return (
        <section
            id="hero"
            data-testid="hero-section"
            className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden"
        >
            <div className="absolute inset-0 grid-bg grid-bg-fade" aria-hidden />
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/[0.08] rounded-full blur-[140px] pointer-events-none"
                aria-hidden
            />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    {/* Left: headline */}
                    <div className="lg:col-span-7">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 mb-6 font-mono text-xs text-cyan-500 uppercase tracking-[0.25em]"
                        >
                            <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                            <span>Available for engagements</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.05 }}
                            data-testid="hero-name"
                            className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter leading-[0.95] text-white"
                        >
                            Anshul
                            <br />
                            <span className="text-cyan-500">Bisht.</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            data-testid="hero-role"
                            className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl leading-relaxed"
                        >
                            <span className="text-white font-medium">
                                AWS Cloud DevOps & SRE Engineer
                            </span>{" "}
                            with 7+ years building scalable, secure, and ruthlessly
                            reliable cloud infrastructure on AWS.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.35 }}
                            className="mt-6 flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-zinc-500 font-mono"
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <MapPin size={14} />
                                {profile?.location || "Ghaziabad, IN"}
                            </span>
                            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                            <span>{profile?.years_experience || 7}+ yrs</span>
                            <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                            <span className="text-cyan-500">AWS · K8s · IaC</span>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="mt-10 flex flex-wrap items-center gap-4"
                        >
                            <button
                                onClick={() => scrollTo("contact")}
                                data-testid="hero-cta-contact"
                                className="group inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 text-black font-mono text-sm font-bold uppercase tracking-wider hover:bg-white transition-colors"
                            >
                                Get in touch
                                <ArrowRight
                                    size={16}
                                    className="group-hover:translate-x-1 transition-transform"
                                />
                            </button>
                            <button
                                onClick={() => scrollTo("projects")}
                                data-testid="hero-cta-work"
                                className="inline-flex items-center gap-2 px-6 py-3 border border-white/15 text-white font-mono text-sm uppercase tracking-wider hover:border-cyan-500 hover:text-cyan-500 transition-colors"
                            >
                                View work
                            </button>
                        </motion.div>
                    </div>

                    {/* Right: terminal card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="lg:col-span-5"
                        data-testid="hero-terminal"
                    >
                        <div className="relative bg-[#0a0a0a] border border-white/10 shadow-2xl">
                            {/* Window chrome */}
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.08] bg-black/40">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                                </div>
                                <span className="font-mono text-[10px] text-zinc-500 tracking-widest">
                                    ~/portfolio — zsh
                                </span>
                                <span className="font-mono text-[10px] text-zinc-600">
                                    80×24
                                </span>
                            </div>
                            {/* Body */}
                            <div className="p-5 font-mono text-sm space-y-2.5 min-h-[280px]">
                                {LINES.slice(0, step + 1).map((line, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="text-zinc-500">
                                            <span className="text-cyan-500">anshul@aws</span>
                                            <span className="text-zinc-700">:</span>
                                            <span className="text-zinc-400">~</span>
                                            <span className="text-zinc-700">$ </span>
                                            <span className="text-white">{line.prompt}</span>
                                        </div>
                                        <div className="text-zinc-300 pl-0">
                                            {idx === step ? (
                                                <Typewriter
                                                    text={line.out}
                                                    onDone={() =>
                                                        setStep((s) =>
                                                            s < LINES.length - 1 ? s + 1 : s,
                                                        )
                                                    }
                                                />
                                            ) : (
                                                line.out
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {step >= LINES.length - 1 && (
                                    <div className="pt-2 text-zinc-500">
                                        <span className="text-cyan-500">anshul@aws</span>
                                        <span className="text-zinc-700">:</span>
                                        <span className="text-zinc-400">~</span>
                                        <span className="text-zinc-700">$ </span>
                                        <span className="caret" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Decorative tag */}
                        <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                            <span>// session: 0x{Math.floor(Math.random() * 1e6).toString(16)}</span>
                            <span className="text-cyan-500">● live</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
