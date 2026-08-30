import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const PROJECT_IMAGES = [
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80",
    "https://images.pexels.com/photos/16018144/pexels-photo-16018144.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    "https://images.pexels.com/photos/34803969/pexels-photo-34803969.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
];

// Responsive 12-column Bento sizing for seamless alignment across all screen sizes
const getBentoClasses = (index) => {
    const cycle = index % 4;
    switch (cycle) {
        case 0:
            // Flagship project: spans 7 cols on desktop, full width on tablet
            return "md:col-span-2 lg:col-span-7 min-h-[300px] lg:min-h-[340px]";
        case 1:
            // Balanced side project: spans 5 cols on desktop (7 + 5 = 12)
            return "md:col-span-1 lg:col-span-5 min-h-[280px] lg:min-h-[340px]";
        case 2:
            // Interlocking pattern: spans 5 cols on desktop
            return "md:col-span-1 lg:col-span-5 min-h-[280px] lg:min-h-[340px]";
        case 3:
            // Secondary flagship: spans 7 cols on desktop (5 + 7 = 12), full width on tablet
            return "md:col-span-2 lg:col-span-7 min-h-[300px] lg:min-h-[340px]";
        default:
            return "md:col-span-1 lg:col-span-6 min-h-[300px]";
    }
};

export default function Projects({ projects }) {
    return (
        <section
            id="projects"
            data-testid="projects-section"
            className="relative py-20 sm:py-24 lg:py-32 border-t border-white/[0.06] overflow-hidden"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-12 sm:mb-14">
                    <div>
                        <div className="font-mono text-xs text-cyan-500 uppercase tracking-[0.25em] mb-4">
                            04 — Selected Work
                        </div>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-white leading-[1.05]">
                            Production-grade outcomes.
                        </h2>
                    </div>
                    <p className="text-zinc-400 max-w-md text-xs sm:text-sm font-mono">
                        // A small, opinionated set of platform and cloud projects with
                        clear, measurable business impact.
                    </p>
                </div>

                <div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 lg:gap-6"
                    data-testid="projects-grid"
                >
                    {projects?.map((p, i) => (
                        <motion.article
                            key={p.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            data-testid={`project-card-${i}`}
                            className={`${getBentoClasses(i)} group relative bg-[#0a0a0a] border border-white/[0.08] hover:border-cyan-500/50 transition-all duration-300 overflow-hidden flex flex-col justify-between rounded-none shadow-xl`}
                        >
                            {/* Background image */}
                            <div
                                className="absolute inset-0 opacity-20 group-hover:opacity-35 transition-opacity duration-500"
                                style={{
                                    backgroundImage: `url(${PROJECT_IMAGES[i % PROJECT_IMAGES.length]})`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-[#0a0a0a]/40 pointer-events-none" />

                            <div className="relative z-10 h-full p-6 sm:p-7 lg:p-8 flex flex-col justify-between gap-6">
                                <div className="flex items-start justify-between gap-4">
                                    <span className="font-mono text-[11px] text-cyan-400 uppercase tracking-widest px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/30">
                                        {String(i + 1).padStart(2, "0")} / 0{projects.length}
                                    </span>
                                    <a
                                        href={p.link || "https://github.com/gitanshulbisht"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`View ${p.title}`}
                                        className="w-8 h-8 rounded border border-white/10 bg-black/40 flex items-center justify-center text-zinc-400 group-hover:text-cyan-400 group-hover:border-cyan-500/50 group-hover:scale-105 transition-all"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>

                                <div>
                                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors">
                                        {p.title}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-zinc-300/90 leading-relaxed mt-2.5 mb-5 max-w-xl">
                                        {p.summary}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/[0.08]">
                                        {p.metric && (
                                            <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-cyan-400 px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/40 uppercase tracking-wider">
                                                {p.metric}
                                            </span>
                                        )}
                                        {p.tech?.map((t) => (
                                            <span
                                                key={t}
                                                className="font-mono text-[10px] text-zinc-400 px-2.5 py-1 border border-white/[0.08] bg-black/40 uppercase tracking-wider"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </div>
        </section>
    );
}
