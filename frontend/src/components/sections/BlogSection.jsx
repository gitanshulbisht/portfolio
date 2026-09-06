import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "../../lib/api";
import fallbackBlogs from "../../data/blogs.json";

export default function BlogSection() {
    const [posts, setPosts] = useState(fallbackBlogs.slice(0, 3));

    useEffect(() => {
        api.get("/blog")
            .then((res) => {
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setPosts(res.data.slice(0, 3));
                }
            })
            .catch(() => {});
    }, []);

    return (
        <section
            id="blog"
            data-testid="blog-section"
            className="relative py-24 lg:py-32 border-t border-white/[0.06]"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
                    <div>
                        <div className="font-mono text-xs text-cyan-500 uppercase tracking-[0.25em] mb-4">
                            06 — Writing
                        </div>
                        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-white leading-[1.05]">
                            Notes from the trenches.
                        </h2>
                    </div>
                    <Link
                        to="/blog"
                        data-testid="blog-view-all"
                        className="self-start lg:self-end inline-flex items-center gap-2 font-mono text-sm text-cyan-500 hover:text-white transition-colors uppercase tracking-wider"
                    >
                        View all <ArrowRight size={14} />
                    </Link>
                </div>

                {posts.length === 0 ? (
                    <div className="font-mono text-sm text-zinc-500">
                        // no posts yet
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6">
                        {posts.map((post, i) => (
                            <Link
                                key={post.id}
                                to={`/blog/${post.slug}`}
                                data-testid={`blog-card-${i}`}
                                className="group bg-[#0a0a0a] border border-white/[0.08] hover:border-cyan-500/40 transition-colors overflow-hidden"
                            >
                                {post.cover_image && (
                                    <div className="aspect-[16/10] overflow-hidden">
                                        <img
                                            src={post.cover_image}
                                            alt=""
                                            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                                        />
                                    </div>
                                )}
                                <div className="p-6">
                                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">
                                        {post.tags?.slice(0, 2).map((t) => (
                                            <span
                                                key={t}
                                                className="text-cyan-500"
                                            >
                                                #{t}
                                            </span>
                                        ))}
                                    </div>
                                    <h3 className="font-display text-lg sm:text-xl font-semibold text-white mb-3 leading-tight group-hover:text-cyan-400 transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <div className="mt-5 font-mono text-xs text-cyan-500 inline-flex items-center gap-1.5">
                                        Read post
                                        <ArrowRight
                                            size={12}
                                            className="group-hover:translate-x-1 transition-transform"
                                        />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
