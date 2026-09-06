import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import fallbackBlogs from "../data/blogs.json";

export default function BlogDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const localFallback = fallbackBlogs.find((p) => p.slug === slug);
    const [post, setPost] = useState(localFallback || null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.get(`/blog/${slug}`)
            .then((res) => setPost(res.data))
            .catch((e) => {
                if (!localFallback) {
                    setError(e.response?.status === 404 ? "Post not found." : e.message);
                }
            });
    }, [slug, localFallback]);

    if (error) {
        return (
            <div className="min-h-screen pt-32 pb-16 flex flex-col items-center justify-center">
                <p className="font-mono text-sm text-zinc-400 mb-4">{error}</p>
                <button
                    onClick={() => navigate("/blog")}
                    className="font-mono text-xs text-cyan-500 hover:text-white uppercase tracking-widest"
                >
                    ← back to blog
                </button>
            </div>
        );
    }
    if (!post) {
        return (
            <div className="min-h-screen pt-32 pb-16 flex items-center justify-center font-mono text-sm text-zinc-500">
                loading…
            </div>
        );
    }

    return (
        <div data-testid="blog-detail-page" className="min-h-screen pt-28 pb-24">
            <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link
                    to="/blog"
                    className="inline-flex items-center gap-2 font-mono text-xs text-zinc-500 hover:text-cyan-500 transition-colors uppercase tracking-widest mb-8"
                >
                    <ArrowLeft size={14} /> all posts
                </Link>

                <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">
                    <span className="text-cyan-500">
                        {new Date(post.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </span>
                    {post.tags?.slice(0, 4).map((t) => (
                        <span key={t}>#{t}</span>
                    ))}
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-white leading-[1.05] mb-6">
                    {post.title}
                </h1>

                <p className="text-lg text-zinc-300 leading-relaxed mb-10">
                    {post.excerpt}
                </p>

                {post.cover_image && (
                    <div className="aspect-[16/9] mb-10 overflow-hidden border border-white/[0.08] rounded">
                        <img
                            src={post.cover_image}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                <div className="prose-dark text-zinc-300 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {post.content}
                    </ReactMarkdown>
                </div>
            </article>
        </div>
    );
}
