import { motion } from "framer-motion";

export default function About({ profile, stats }) {
    return (
        <section
            id="about"
            data-testid="about-section"
            className="relative py-24 lg:py-32 border-t border-white/[0.06]"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-16">
                    <div className="lg:col-span-4">
                        <div className="font-mono text-xs text-cyan-500 uppercase tracking-[0.25em] mb-4">
                            01 — About
                        </div>
                        <h2
                            data-testid="about-heading"
                            className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-white leading-[1.05]"
                        >
                            Building cloud systems
                            <br />
                            that <span className="text-cyan-500">don't page you</span> at
                            3 AM.
                        </h2>
                    </div>

                    <div className="lg:col-span-7 lg:col-start-6">
                        <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
                            {profile?.summary}
                        </p>
                        <p className="mt-6 text-zinc-400 leading-relaxed">
                            I've spent the last seven years inside engineering orgs at{" "}
                            <span className="text-white">Cognizant</span>,{" "}
                            <span className="text-white">Infosys</span>, and{" "}
                            <span className="text-white">Moksa Technologies</span> —
                            migrating legacy stacks to AWS, shipping GitOps platforms on
                            EKS, and reducing cloud spend without compromising reliability.
                            Today, I consult independently for teams that want their
                            infrastructure to feel boring (in the best way).
                        </p>

                        {/* Stats bento */}
                        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 border border-white/[0.08]">
                            {stats?.map((s, i) => (
                                <motion.div
                                    key={s.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08 }}
                                    className={`p-5 sm:p-6 border-white/[0.08] ${
                                        i % 2 === 0 ? "border-r" : "border-r-0"
                                    } ${i < 2 ? "border-b" : "border-b-0"} ${
                                        i < 3 ? "sm:border-r" : "sm:border-r-0"
                                    } sm:border-b-0`}
                                    data-testid={`stat-${i}`}
                                >
                                    <div className="font-display text-3xl lg:text-4xl font-bold text-white tracking-tighter">
                                        {s.value}
                                    </div>
                                    <div className="mt-1 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                                        {s.label}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
