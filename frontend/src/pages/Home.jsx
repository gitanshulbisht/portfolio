import { useEffect, useState } from "react";
import { api } from "../lib/api";
import Hero from "../components/sections/Hero";
import About from "../components/sections/About";
import Skills from "../components/sections/Skills";
import Experience from "../components/sections/Experience";
import Projects from "../components/sections/Projects";
import Certifications from "../components/sections/Certifications";
import BlogSection from "../components/sections/BlogSection";
import Contact from "../components/sections/Contact";
import fallbackData from "../data/fallback.json";

// Render instantly from a cached snapshot so the page is interactive even while
// the (free-tier) backend cold-starts. The backend response, when it arrives,
// replaces the snapshot with the freshest data.
export default function Home() {
    const [data, setData] = useState(fallbackData);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        api
            .get("/portfolio")
            .then((res) => {
                if (!cancelled) setData(res.data);
            })
            .catch((e) => {
                if (!cancelled) setError(e.message);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (error && data === fallbackData) {
        return (
            <div className="min-h-screen flex items-center justify-center font-mono text-sm text-red-400">
                Failed to load portfolio data: {error}
            </div>
        );
    }

    return (
        <div data-testid="home-page">
            <Hero profile={data.profile} />
            <About profile={data.profile} stats={data.stats} />
            <Skills skills={data.skills} />
            <Experience experience={data.experience} />
            <Projects projects={data.projects} />
            <Certifications
                certifications={data.certifications}
                education={data.education}
            />
            <BlogSection />
            <Contact profile={data.profile} social={data.social} />
        </div>
    );
}
