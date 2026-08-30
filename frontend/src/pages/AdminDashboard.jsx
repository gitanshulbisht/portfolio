import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { api, formatApiErrorDetail } from "../lib/api";
import { toast } from "sonner";
import PortfolioEditor from "../components/admin/PortfolioEditor";
import AISettingsPanel from "../components/admin/AISettingsPanel";
import {
    LogOut,
    Mail,
    MailOpen,
    Trash2,
    Plus,
    Edit3,
    X,
    Bot,
} from "lucide-react";

export default function AdminDashboard() {
    const { user, ready, logout } = useAuth();
    const [tab, setTab] = useState("contacts");
    const [contacts, setContacts] = useState([]);
    const [posts, setPosts] = useState([]);
    const [editing, setEditing] = useState(null);
    const [showEditor, setShowEditor] = useState(false);

    useEffect(() => {
        if (ready && user && user !== false) {
            loadContacts();
            loadPosts();
        }
    }, [ready, user]);

    const loadContacts = async () => {
        try {
            const { data } = await api.get("/admin/contacts");
            setContacts(data);
        } catch (e) {
            toast.error(formatApiErrorDetail(e.response?.data?.detail));
        }
    };
    const loadPosts = async () => {
        try {
            const { data } = await api.get("/admin/blog");
            setPosts(data);
        } catch (e) {
            toast.error(formatApiErrorDetail(e.response?.data?.detail));
        }
    };

    if (!ready) return <div className="min-h-screen" />;
    if (!user || user === false) return <Navigate to="/admin/login" replace />;

    const markRead = async (id) => {
        await api.patch(`/admin/contacts/${id}/read`);
        loadContacts();
    };
    const deleteContact = async (id) => {
        if (!confirm("Delete this submission?")) return;
        await api.delete(`/admin/contacts/${id}`);
        loadContacts();
    };
    const deletePost = async (id) => {
        if (!confirm("Delete this post?")) return;
        await api.delete(`/admin/blog/${id}`);
        loadPosts();
    };

    const unreadCount = contacts.filter((c) => !c.read).length;

    return (
        <div
            data-testid="admin-dashboard-page"
            className="min-h-screen bg-[#030303]"
        >
            {/* Top bar */}
            <header className="border-b border-white/[0.08] bg-black/40 backdrop-blur-sm sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                    <Link to="/" className="font-mono text-sm text-white">
                        <span className="text-cyan-500">~/admin</span>
                        <span className="text-zinc-500"> $ </span>
                        <span className="text-zinc-300">dashboard</span>
                    </Link>
                    <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-zinc-500">
                            logged in as{" "}
                            <span className="text-cyan-500">{user.email}</span>
                        </span>
                        <button
                            data-testid="admin-logout-btn"
                            onClick={logout}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-zinc-400 hover:text-cyan-500 hover:border-cyan-500 transition-colors uppercase tracking-widest"
                        >
                            <LogOut size={12} />
                            logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Tabs */}
                <div className="flex items-center border-b border-white/[0.08] mb-8">
                    <button
                        data-testid="admin-tab-contacts"
                        onClick={() => setTab("contacts")}
                        className={`px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-colors ${
                            tab === "contacts"
                                ? "border-cyan-500 text-cyan-500"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        Submissions{" "}
                        {unreadCount > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center w-4 h-4 bg-cyan-500 text-black text-[10px] rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        data-testid="admin-tab-blog"
                        onClick={() => setTab("blog")}
                        className={`px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-colors ${
                            tab === "blog"
                                ? "border-cyan-500 text-cyan-500"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        Blog Posts ({posts.length})
                    </button>
                    <button
                        data-testid="admin-tab-content"
                        onClick={() => setTab("content")}
                        className={`px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-colors ${
                            tab === "content"
                                ? "border-cyan-500 text-cyan-500"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        Site Content
                    </button>
                    <button
                        data-testid="admin-tab-ai"
                        onClick={() => setTab("ai")}
                        className={`px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-colors inline-flex items-center gap-1.5 ${
                            tab === "ai"
                                ? "border-cyan-500 text-cyan-500"
                                : "border-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                    >
                        <Bot size={13} />
                        AI Engine
                    </button>
                </div>

                {tab === "contacts" && (
                    <ContactsTable
                        contacts={contacts}
                        onRead={markRead}
                        onDelete={deleteContact}
                    />
                )}

                {tab === "blog" && (
                    <PostsTable
                        posts={posts}
                        onCreate={() => {
                            setEditing(null);
                            setShowEditor(true);
                        }}
                        onEdit={(p) => {
                            setEditing(p);
                            setShowEditor(true);
                        }}
                        onDelete={deletePost}
                    />
                )}

                {tab === "content" && <PortfolioEditor />}
                {tab === "ai" && <AISettingsPanel />}
            </main>

            {showEditor && (
                <BlogEditor
                    existing={editing}
                    onClose={() => setShowEditor(false)}
                    onSaved={() => {
                        setShowEditor(false);
                        loadPosts();
                    }}
                />
            )}
        </div>
    );
}

function ContactsTable({ contacts, onRead, onDelete }) {
    if (contacts.length === 0) {
        return (
            <div
                data-testid="admin-contacts-empty"
                className="font-mono text-sm text-zinc-500 p-8 border border-white/[0.08]"
            >
                // no submissions yet
            </div>
        );
    }
    return (
        <div
            data-testid="admin-contacts-list"
            className="border border-white/[0.08] divide-y divide-white/[0.06]"
        >
            {contacts.map((c) => (
                <div
                    key={c.id}
                    data-testid={`admin-contact-${c.id}`}
                    className={`p-5 grid grid-cols-12 gap-4 ${
                        !c.read ? "bg-cyan-500/[0.03]" : ""
                    }`}
                >
                    <div className="col-span-12 sm:col-span-3 min-w-0">
                        <div className="flex items-center gap-2">
                            {!c.read ? (
                                <Mail size={14} className="text-cyan-500" />
                            ) : (
                                <MailOpen size={14} className="text-zinc-600" />
                            )}
                            <span className="text-white font-medium truncate">
                                {c.name}
                            </span>
                        </div>
                        <a
                            href={`mailto:${c.email}`}
                            className="block font-mono text-xs text-cyan-500 mt-1 truncate"
                        >
                            {c.email}
                        </a>
                        <div className="font-mono text-[10px] text-zinc-600 mt-1">
                            {new Date(c.created_at).toLocaleString()}
                        </div>
                    </div>
                    <div className="col-span-12 sm:col-span-7">
                        {c.subject && (
                            <div className="text-zinc-300 font-medium mb-1">
                                {c.subject}
                            </div>
                        )}
                        <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">
                            {c.message}
                        </p>
                    </div>
                    <div className="col-span-12 sm:col-span-2 flex sm:flex-col sm:items-end gap-2">
                        {!c.read && (
                            <button
                                onClick={() => onRead(c.id)}
                                data-testid={`mark-read-${c.id}`}
                                className="font-mono text-[10px] text-zinc-400 hover:text-cyan-500 uppercase tracking-widest"
                            >
                                mark read
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(c.id)}
                            data-testid={`delete-contact-${c.id}`}
                            className="font-mono text-[10px] text-zinc-500 hover:text-red-400 uppercase tracking-widest inline-flex items-center gap-1"
                        >
                            <Trash2 size={11} /> delete
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function PostsTable({ posts, onCreate, onEdit, onDelete }) {
    return (
        <div>
            <div className="flex justify-end mb-4">
                <button
                    onClick={onCreate}
                    data-testid="admin-new-post-btn"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-white transition-colors"
                >
                    <Plus size={14} /> New post
                </button>
            </div>
            {posts.length === 0 ? (
                <div className="font-mono text-sm text-zinc-500 p-8 border border-white/[0.08]">
                    // no posts
                </div>
            ) : (
                <div className="border border-white/[0.08] divide-y divide-white/[0.06]">
                    {posts.map((p) => (
                        <div
                            key={p.id}
                            data-testid={`admin-post-${p.id}`}
                            className="p-5 flex items-center justify-between gap-4"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-medium truncate">
                                        {p.title}
                                    </span>
                                    <span
                                        className={`font-mono text-[10px] px-2 py-0.5 uppercase tracking-widest border ${
                                            p.published
                                                ? "text-green-400 border-green-500/40"
                                                : "text-zinc-500 border-white/[0.08]"
                                        }`}
                                    >
                                        {p.published ? "live" : "draft"}
                                    </span>
                                </div>
                                <div className="font-mono text-xs text-zinc-500 mt-1 truncate">
                                    /blog/{p.slug}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => onEdit(p)}
                                    data-testid={`edit-post-${p.id}`}
                                    className="font-mono text-[10px] text-zinc-400 hover:text-cyan-500 uppercase tracking-widest inline-flex items-center gap-1"
                                >
                                    <Edit3 size={11} /> edit
                                </button>
                                <button
                                    onClick={() => onDelete(p.id)}
                                    data-testid={`delete-post-${p.id}`}
                                    className="font-mono text-[10px] text-zinc-500 hover:text-red-400 uppercase tracking-widest inline-flex items-center gap-1"
                                >
                                    <Trash2 size={11} /> delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function BlogEditor({ existing, onClose, onSaved }) {
    const [form, setForm] = useState({
        title: existing?.title || "",
        excerpt: existing?.excerpt || "",
        content: existing?.content || "",
        tags: existing?.tags?.join(", ") || "",
        cover_image: existing?.cover_image || "",
        published: existing?.published ?? true,
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!form.title || !form.excerpt || !form.content) {
            toast.error("Title, excerpt and content are required.");
            return;
        }
        setSaving(true);
        const payload = {
            ...form,
            tags: form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean),
            cover_image: form.cover_image || null,
        };
        try {
            if (existing) {
                await api.put(`/admin/blog/${existing.id}`, payload);
                toast.success("Post updated.");
            } else {
                await api.post("/admin/blog", payload);
                toast.success("Post created.");
            }
            onSaved();
        } catch (e) {
            toast.error(
                formatApiErrorDetail(e.response?.data?.detail) ||
                    "Could not save post.",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
            <div
                data-testid="blog-editor"
                className="bg-[#0a0a0a] border border-white/10 w-full max-w-3xl my-10"
            >
                <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                    <div className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                        {existing ? "edit post" : "new post"}
                    </div>
                    <button
                        onClick={onClose}
                        data-testid="blog-editor-close"
                        className="text-zinc-500 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <Field label="Title">
                        <input
                            value={form.title}
                            onChange={(e) =>
                                setForm({ ...form, title: e.target.value })
                            }
                            data-testid="editor-title"
                            className="w-full bg-transparent border-b border-white/15 focus:border-cyan-500 outline-none py-2 text-white font-mono text-sm"
                        />
                    </Field>
                    <Field label="Excerpt">
                        <textarea
                            value={form.excerpt}
                            onChange={(e) =>
                                setForm({ ...form, excerpt: e.target.value })
                            }
                            rows={2}
                            data-testid="editor-excerpt"
                            className="w-full bg-transparent border-b border-white/15 focus:border-cyan-500 outline-none py-2 text-white font-mono text-sm resize-none"
                        />
                    </Field>
                    <Field label="Content">
                        <textarea
                            value={form.content}
                            onChange={(e) =>
                                setForm({ ...form, content: e.target.value })
                            }
                            rows={10}
                            data-testid="editor-content"
                            className="w-full bg-transparent border border-white/15 focus:border-cyan-500 outline-none p-3 text-white font-mono text-sm resize-y"
                        />
                    </Field>
                    <div className="grid sm:grid-cols-2 gap-5">
                        <Field label="Tags (comma separated)">
                            <input
                                value={form.tags}
                                onChange={(e) =>
                                    setForm({ ...form, tags: e.target.value })
                                }
                                data-testid="editor-tags"
                                className="w-full bg-transparent border-b border-white/15 focus:border-cyan-500 outline-none py-2 text-white font-mono text-sm"
                            />
                        </Field>
                        <Field label="Cover image URL">
                            <input
                                value={form.cover_image}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        cover_image: e.target.value,
                                    })
                                }
                                data-testid="editor-cover"
                                className="w-full bg-transparent border-b border-white/15 focus:border-cyan-500 outline-none py-2 text-white font-mono text-sm"
                            />
                        </Field>
                    </div>
                    <label className="flex items-center gap-2 font-mono text-xs text-zinc-400">
                        <input
                            type="checkbox"
                            checked={form.published}
                            onChange={(e) =>
                                setForm({ ...form, published: e.target.checked })
                            }
                            data-testid="editor-published"
                            className="accent-cyan-500"
                        />
                        Publish immediately
                    </label>
                </div>
                <div className="p-5 border-t border-white/[0.08] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-white/10 text-zinc-400 font-mono text-xs uppercase tracking-widest hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={save}
                        disabled={saving}
                        data-testid="editor-save"
                        className="px-5 py-2 bg-cyan-500 text-black font-mono text-xs font-bold uppercase tracking-widest hover:bg-white disabled:opacity-50"
                    >
                        {saving ? "Saving…" : existing ? "Update" : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <span className="block font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                {label}
            </span>
            {children}
        </label>
    );
}
