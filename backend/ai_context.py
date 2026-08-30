"""
ai_context.py: Grounded portfolio knowledge base and system prompts for Anshul Bisht's AI assistants.
"""

PORTFOLIO_PROFILE = {
    "name": "Anshul Bisht",
    "title": "AWS Cloud DevOps & SRE Engineer",
    "years_experience": "7+",
    "location": "Vasundhara, Ghaziabad, UP",
    "bio": (
        "AWS-focused Cloud DevOps & SRE Engineer with 7+ years of experience designing, automating, and managing "
        "scalable, secure, and highly available cloud infrastructure on Amazon Web Services. Strong expertise in "
        "AWS-native services, CI/CD automation, Infrastructure as Code, container orchestration, and DevSecOps practices."
    ),
    "stats": [
        {"label": "Years Experience", "value": "7+"},
        {"label": "AWS Services Mastered", "value": "20+"},
        {"label": "Cost Optimized", "value": "~20%"},
        {"label": "Pipelines Shipped", "value": "50+"}
    ],
    "skills": {
        "aws_cloud": ["EC2", "VPC", "IAM", "S3", "EBS", "EFS", "RDS", "DynamoDB", "ELB/ALB/NLB", "Auto Scaling", "Route 53", "CloudFront", "EKS", "ECS", "Lambda", "API Gateway", "CloudWatch", "CloudTrail", "AWS Config", "AWS Backup"],
        "containers": ["Docker", "Kubernetes", "Amazon EKS", "ECS (Fargate)", "Helm"],
        "iac": ["Terraform", "AWS CloudFormation", "Ansible"],
        "cicd_gitops": ["Jenkins", "GitHub Actions", "GitLab CI/CD", "Argo CD", "AWS CodePipeline", "CodeBuild", "CodeDeploy"],
        "monitoring": ["CloudWatch", "Prometheus", "Grafana", "ELK Stack", "OpenTelemetry"],
        "security": ["IAM", "KMS", "Security Groups", "AWS Secrets Manager", "HashiCorp Vault", "WAF", "Shield", "PagerDuty"],
        "frontend_backend": ["React", "Python", "FastAPI", "MongoDB", "Bash", "Node.js"]
    },
    "experience": [
        {
            "company": "Freelance Consultant",
            "role": "AWS Cloud & DevOps Engineer",
            "period": "Jul 2024 - Present",
            "highlights": "Designed scalable AWS architectures, built containerized microservices on EKS/ECS Fargate, automated with Terraform, GitHub Actions, and SLO observability."
        },
        {
            "company": "Cognizant",
            "role": "Senior AWS Cloud DevOps Engineer",
            "period": "Aug 2023 - Jul 2024",
            "highlights": "Built CI/CD pipelines for microservices, operated highly available EKS clusters with Helm and Argo CD (GitOps), reduced cloud cost via Auto Scaling and Spot Instances."
        },
        {
            "company": "Infosys",
            "role": "Senior DevOps Engineer (AWS)",
            "period": "Sep 2021 - Aug 2023",
            "highlights": "Led legacy on-prem migrations to AWS, authored reusable Terraform modules, built CI/CD pipelines, shipped blue-green/canary deployments on Kubernetes."
        },
        {
            "company": "Moksa Technologies",
            "role": "DevOps Engineer",
            "period": "Dec 2017 - Sep 2021",
            "highlights": "Managed AWS production environments (EC2, S3, RDS, IAM, ELB), automated ops using Python and Bash, containerized applications with Docker."
        }
    ],
    "projects": [
        {
            "name": "AWS Cloud Migration",
            "description": "Migrated legacy on-prem applications to AWS, achieving zero-downtime cutover and improved scalability.",
            "tech": ["AWS", "Terraform", "EC2", "RDS", "VPC"]
        },
        {
            "name": "EKS Production Platform",
            "description": "Designed a secure, highly available EKS platform with GitOps-based deployments via Argo CD, reaching 99.95% uptime.",
            "tech": ["EKS", "Helm", "Argo CD", "Terraform"]
        },
        {
            "name": "Cost Optimization Initiative",
            "description": "Reduced AWS monthly spend by ~20% through Spot Instances, rightsizing, and auto-scaling.",
            "tech": ["AWS", "Spot Instances", "Auto Scaling"]
        },
        {
            "name": "CI/CD Modernization",
            "description": "Replaced legacy Jenkins jobs with scalable, secure pipelines on GitHub Actions, cutting release cycles by 3x.",
            "tech": ["GitHub Actions", "Trivy", "SonarQube"]
        },
        {
            "name": "DevOps React Portfolio",
            "description": "Full-stack personal portfolio featuring automated CI/CD deployment to GitHub Pages and Render backend with keep-alive monitoring and AI chatbot.",
            "tech": ["React", "Tailwind CSS", "FastAPI", "MongoDB", "GitHub Actions"]
        }
    ],
    "contact": {
        "github": "https://github.com/gitanshulbisht",
        "linkedin": "https://www.linkedin.com/in/anshul-bisht/",
        "email": "anshulbisht.93.ab@gmail.com"
    }
}

def get_portfolio_context() -> str:
    p = PORTFOLIO_PROFILE
    skills_str = "\n".join([f"- {category.replace('_', ' ').title()}: {', '.join(items)}" for category, items in p["skills"].items()])
    projects_str = "\n".join([
        f"- {proj['name']}: {proj['description']} (Tech: {', '.join(proj['tech'])})"
        for proj in p["projects"]
    ])
    exp_str = "\n".join([
        f"- {exp['role']} at {exp['company']} ({exp['period']}): {exp['highlights']}"
        for exp in p["experience"]
    ])
    stats_str = ", ".join([f"{s['label']}: {s['value']}" for s in p["stats"]])
    
    return f"""
Candidate Name: {p['name']}
Title: {p['title']}
Total Experience: {p['years_experience']} years ({stats_str})
Location: {p['location']}
Summary: {p['bio']}

Professional Work Experience:
{exp_str}

Skills & Technical Expertise:
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
