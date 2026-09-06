import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowRight, ArrowLeft } from "lucide-react";
import fallbackBlogs from "../data/blogs.json";

export default function BlogList() {
    const [posts, setPosts] = useState(fallbackBlogs);

    useEffect(() => {
        api.get("/blog")
            .then((res) => {
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setPosts(res.data);
                }
            })
            .catch(() => {
                // Retain fallbackBlogs
            });
    }, []);

    return (
        <div data-testid="blog-list-page" className="min-h-screen pt-32 pb-24">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link
                    to="/"
                    data-testid="blog-back-home"
                    className="inline-flex items-center gap-2 font-mono text-xs text-zinc-500 hover:text-cyan-500 transition-colors uppercase tracking-widest mb-8"
                >
                    <ArrowLeft size={14} /> back to home
                </Link>
                <div className="font-mono text-xs text-cyan-500 uppercase tracking-[0.25em] mb-4">
                    /blog
                </div>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter text-white leading-[1.02] mb-4">
                    Writing.
                </h1>
                <p className="text-zinc-400 max-w-2xl mb-14">
                    Field notes, playbooks and the occasional rant — from running
                    production cloud infrastructure for the last seven years.
                </p>

                {posts === null ? (
                    <div className="font-mono text-sm text-zinc-500">loading…</div>
                ) : posts.length === 0 ? (
                    <div className="font-mono text-sm text-zinc-500">
                        // no posts yet
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                        {posts.map((p, i) => (
                            <Link
                                key={p.id}
                                to={`/blog/${p.slug}`}
                                data-testid={`blog-list-item-${i}`}
                                className="group block py-8 hover:bg-white/[0.02] transition-colors px-2 -mx-2"
                            >
                                <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-3">
                                            <span className="text-cyan-500">
                                                {new Date(p.created_at).toLocaleDateString(
                                                    "en-US",
                                                    {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    },
                                                )}
                                            </span>
                                            {p.tags?.slice(0, 3).map((t) => (
                                                <span key={t}>#{t}</span>
                                            ))}
                                        </div>
                                        <h2 className="font-display text-xl sm:text-2xl font-semibold text-white group-hover:text-cyan-400 transition-colors leading-tight">
                                            {p.title}
                                        </h2>
                                        <p className="mt-3 text-zinc-400 max-w-2xl">
                                            {p.excerpt}
                                        </p>
                                    </div>
                                    <ArrowRight
                                        size={18}
                                        className="text-zinc-600 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all shrink-0 mt-2"
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
