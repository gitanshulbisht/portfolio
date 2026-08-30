import { motion } from "framer-motion";
import { Award, Clock } from "lucide-react";

export default function Certifications({ certifications, education }) {
    return (
        <section
            id="certs"
            data-testid="certs-section"
            className="relative py-24 lg:py-32 border-t border-white/[0.06]"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-14">
                    <div className="font-mono text-xs text-cyan-500 uppercase tracking-[0.25em] mb-4">
                        05 — Credentials
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-white leading-[1.05]">
                        Certifications &amp; education.
                    </h2>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Certifications column (2) */}
                    <div className="lg:col-span-2">
                        <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
                            // certifications
                        </div>
                        <div className="space-y-3">
                            {certifications?.map((c, i) => (
                                <motion.div
                                    key={c.name}
                                    initial={{ opacity: 0, y: 14 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.06 }}
                                    data-testid={`cert-${i}`}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 bg-[#0a0a0a] border border-white/[0.08] hover:border-cyan-500/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                                        <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-cyan-500/10 border border-cyan-500/30 shrink-0">
                                            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-white font-medium text-sm sm:text-base">
                                                {c.name}
                                            </div>
                                            <div className="font-mono text-xs text-zinc-500 mt-0.5">
                                                {c.issuer} · {c.year}
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className={`self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2 py-1 border ${
                                            c.status === "Active"
                                                ? "text-green-400 border-green-500/40 bg-green-500/5"
                                                : c.status === "In Progress"
                                                  ? "text-cyan-400 border-cyan-500/40 bg-cyan-500/5"
                                                  : "text-zinc-500 border-white/[0.08]"
                                        }`}
                                    >
                                        <Clock size={10} />
                                        {c.status}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Education column */}
                    <div>
                        <div className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
                            // education
                        </div>
                        <div className="space-y-3">
                            {education?.map((e, i) => (
                                <div
                                    key={i}
                                    data-testid={`edu-${i}`}
                                    className="p-5 bg-[#0a0a0a] border border-white/[0.08]"
                                >
                                    <div className="text-white font-medium">{e.degree}</div>
                                    <div className="font-mono text-xs text-zinc-500 mt-1.5">
                                        {e.institution}
                                    </div>
                                    <div className="font-mono text-xs text-cyan-500 mt-2">
                                        Class of {e.year}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
