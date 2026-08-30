import { Suspense, lazy } from "react";
import { HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CustomCursor from "./components/CustomCursor";
import Home from "./pages/Home";
import ChatWidget from "./components/chat/ChatWidget";
import VoiceWidget from "./components/voice/VoiceWidget";

// Lazy-load secondary routes so they don't bloat the initial bundle.
// Home (the landing page) stays eager for an instant first paint.
const BlogList = lazy(() => import("./pages/BlogList"));
const BlogDetail = lazy(() => import("./pages/BlogDetail"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

function Shell({ children }) {
    const location = useLocation();
    const isAdmin =
        location.pathname.startsWith("/admin") ||
        location.pathname.startsWith("/portfolio/admin");
    return (
        <>
            {!isAdmin && <Navbar />}
            {children}
            {!isAdmin && <Footer profile={{ name: "Anshul Bisht" }} />}
            {!isAdmin && (
                <>
                    <ChatWidget />
                    <VoiceWidget />
                </>
            )}
        </>
    );
}

function PortfolioRedirect() {
    const location = useLocation();
    return (
        <Navigate
            to={location.pathname.replace(/^\/portfolio/, "") || "/"}
            replace
        />
    );
}

export default function App() {
    return (
        <AuthProvider>
            <HashRouter>
                <CustomCursor />
                <Toaster
                    position="bottom-right"
                    theme="dark"
                    toastOptions={{
                        style: {
                            background: "#0a0a0a",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#fff",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: "12px",
                            borderRadius: 0,
                        },
                    }}
                />
                <Shell>
                    <Suspense
                        fallback={
                            <div className="min-h-screen flex items-center justify-center font-mono text-sm text-zinc-500">
                                <span className="text-cyan-500">$</span>&nbsp;loading
                                <span className="caret" />
                            </div>
                        }
                    >
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/blog" element={<BlogList />} />
                            <Route path="/blog/:slug" element={<BlogDetail />} />
                            <Route path="/portfolio/*" element={<PortfolioRedirect />} />
                            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                            <Route path="/admin/login" element={<AdminLogin />} />
                            <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        </Routes>
                    </Suspense>
                </Shell>
            </HashRouter>
        </AuthProvider>
    );
}
