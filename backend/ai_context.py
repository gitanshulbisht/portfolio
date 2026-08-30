"""
ai_context.py: Grounded portfolio knowledge base and system prompts for Anshul Bisht's AI assistants.
"""

PORTFOLIO_PROFILE = {
    "name": "Anshul Bisht",
    "title": "Full-Stack & DevOps Engineer",
    "bio": (
        "Passionate engineer specializing in modern React frontends, robust FastAPI backends, "
        "cloud infrastructure, containerization with Docker and Kubernetes, and automated CI/CD pipelines."
    ),
    "skills": {
        "frontend": ["React", "JavaScript (ES6+)", "Tailwind CSS", "HTML5/CSS3", "Responsive UI"],
        "backend": ["Python", "FastAPI", "RESTful APIs", "MongoDB", "Node.js"],
        "devops_cloud": ["Docker", "Kubernetes", "AWS", "Render", "GitHub Actions", "CI/CD pipelines", "Linux"],
        "tools": ["Git", "Postman", "VS Code", "Vim"]
    },
    "projects": [
        {
            "name": "DevOps React Portfolio",
            "description": "Full-stack portfolio featuring automated CI/CD deployment to GitHub Pages and Render backend with keep-alive monitoring.",
            "tech": ["React", "Tailwind CSS", "FastAPI", "MongoDB", "GitHub Actions"]
        },
        {
            "name": "Cloud Infrastructure & CI/CD Pipeline Automation",
            "description": "Automated build, test, and containerized deployment workflows using GitHub Actions, Docker, and cloud web services.",
            "tech": ["Docker", "GitHub Actions", "Python", "Cloud Hosting"]
        }
    ],
    "contact": {
        "github": "https://github.com/gitanshulbisht",
        "linkedin": "https://www.linkedin.com/in/gitanshulbisht",
        "email": "anshulbisht.dev@gmail.com"
    }
}

def get_portfolio_context() -> str:
    p = PORTFOLIO_PROFILE
    skills_str = "\n".join([f"- {category.title()}: {', '.join(items)}" for category, items in p["skills"].items()])
    projects_str = "\n".join([
        f"- {proj['name']}: {proj['description']} (Tech: {', '.join(proj['tech'])})"
        for proj in p["projects"]
    ])
    
    return f"""
Candidate Name: {p['name']}
Title: {p['title']}
Summary: {p['bio']}

Skills & Expertise:
{skills_str}

Key Projects:
{projects_str}

Contact & Links:
- GitHub: {p['contact']['github']}
- LinkedIn: {p['contact']['linkedin']}
- Email: {p['contact']['email']}
"""

def build_chat_system_instruction() -> str:
    context = get_portfolio_context()
    return f"""You are Anshul Bisht's personal AI Portfolio Representative.
Your mission is to welcome visitors, answer questions regarding Anshul's skills, background, projects, and work experience, and help recruiters or collaborators get in touch with him.

Guidelines:
1. Always be professional, warm, articulate, and confident.
2. Ground your answers strictly in the knowledge provided below. Do not make up facts or experiences outside this profile.
3. If asked about something not in Anshul's background, politely state that it is outside his current profile but highlight related strengths if applicable.
4. Format responses cleanly using markdown (bullet points, bold text, links).
5. If the visitor asks to contact or hire Anshul, provide his GitHub and contact details.

Portfolio Knowledge Base:
{context}
"""

def build_voice_system_instruction() -> str:
    context = get_portfolio_context()
    return f"""You are Anshul Bisht's Voice AI Assistant on his portfolio website.
You are engaged in an interactive voice conversation with a visitor.

Critical Spoken Voice Rules:
1. Keep answers conversational, natural, and concise (1 to 3 short sentences maximum).
2. Avoid bullet points, long lists, markdown links, code blocks, or raw URLs since your output will be read aloud via text-to-speech.
3. Speak enthusiastically and directly: "Anshul is a Full-Stack and DevOps engineer who works heavily with React, FastAPI, and Docker."
4. Ground all answers strictly in the profile below.

Portfolio Knowledge Base:
{context}
"""
