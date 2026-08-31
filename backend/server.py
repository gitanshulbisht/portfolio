from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import secrets
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from starlette.middleware.cors import CORSMiddleware
from ai_assistant import ai_router

# -------------------- Configuration --------------------
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 60 * 24  # 24h for portfolio admin convenience
REFRESH_TOKEN_DAYS = 7
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

# Use secure cookies if not explicitly in development mode
SECURE_COOKIES = os.environ.get("ENVIRONMENT", "production").lower() != "development"

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Anshul Bisht Portfolio API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# -------------------- Helpers --------------------
def get_jwt_secret() -> str:
    """Docstring for get_jwt_secret."""
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    """Docstring for hash_password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Docstring for verify_password."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    """Docstring for create_access_token."""
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Docstring for create_refresh_token."""
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    """Docstring for set_auth_cookies."""
    response.set_cookie("access_token", access, httponly=True, secure=SECURE_COOKIES, samesite="lax",
                        max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=SECURE_COOKIES, samesite="lax",
                        max_age=REFRESH_TOKEN_DAYS * 86400, path="/")


def slugify(text: str) -> str:
    """Docstring for slugify."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')


async def get_current_user(request: Request) -> dict:
    """Docstring for get_current_user."""
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# -------------------- Models --------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: str


class ContactSubmissionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    subject: Optional[str] = Field(default="", max_length=200)
    message: str = Field(min_length=1, max_length=5000)


class ContactSubmission(BaseModel):
    id: str
    name: str
    email: EmailStr
    subject: str
    message: str
    read: bool
    created_at: str


class BlogPostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    excerpt: str = Field(min_length=1, max_length=400)
    content: str = Field(min_length=1)
    tags: List[str] = []
    cover_image: Optional[str] = None
    published: bool = True


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    cover_image: Optional[str] = None
    published: Optional[bool] = None


class BlogPost(BaseModel):
    id: str
    title: str
    slug: str
    excerpt: str
    content: str
    tags: List[str]
    cover_image: Optional[str] = None
    published: bool
    created_at: str
    updated_at: str


# -------------------- Portfolio static data --------------------
PORTFOLIO_DATA = {
    "profile": {
        "name": "Anshul Bisht",
        "role": "AWS Cloud DevOps & SRE Engineer",
        "tagline": "Designing scalable, secure cloud infrastructure on AWS",
        "location": "Vasundhara, Ghaziabad, UP",
        "email": "anshul123bisht@gmail.com",
        "phone": "+91 8588078837",
        "years_experience": 7,
        "summary": "AWS-focused Cloud DevOps Engineer with 7+ years of experience designing, automating, and managing scalable, secure, and highly available cloud infrastructure on Amazon Web Services. Strong expertise in AWS-native services, CI/CD automation, Infrastructure as Code, container orchestration, and DevSecOps practices.",
    },
    "stats": [
        {"label": "Years Experience", "value": "7+"},
        {"label": "AWS Services Mastered", "value": "20+"},
        {"label": "Cost Optimized", "value": "~20%"},
        {"label": "Pipelines Shipped", "value": "50+"},
    ],
    "skills": [
        {"category": "AWS Cloud Services", "items": ["EC2", "VPC", "IAM", "S3", "EBS", "EFS", "RDS", "DynamoDB", "ELB/ALB/NLB", "Auto Scaling", "Route 53", "CloudFront", "EKS", "ECS", "Lambda", "API Gateway", "CloudWatch", "CloudTrail", "AWS Config", "AWS Backup"]},
        {"category": "Containers & Orchestration", "items": ["Docker", "Kubernetes", "Amazon EKS", "ECS (Fargate)", "Helm"]},
        {"category": "Infrastructure as Code", "items": ["Terraform", "AWS CloudFormation", "Ansible"]},
        {"category": "CI/CD & GitOps", "items": ["Jenkins", "GitHub Actions", "GitLab CI/CD", "Argo CD", "AWS CodePipeline", "CodeBuild", "CodeDeploy"]},
        {"category": "Monitoring & Observability", "items": ["CloudWatch", "Prometheus", "Grafana", "ELK Stack", "OpenTelemetry"]},
        {"category": "Security & DevSecOps", "items": ["IAM", "KMS", "Security Groups", "AWS Secrets Manager", "HashiCorp Vault", "WAF", "Shield", "PagerDuty", "Splunk"]},
        {"category": "Scripting & Automation", "items": ["Bash", "Python", "Shell Scripting"]},
        {"category": "Site Reliability Engineering", "items": ["SLI/SLO/SLA", "Incident Management", "RCA", "Chaos Engineering", "Capacity Planning", "HA & DR"]},
    ],
    "experience": [
        {
            "company": "Freelance Consultant",
            "role": "AWS Cloud & DevOps Engineer",
            "location": "Remote",
            "start": "Jul 2024",
            "end": "Present",
            "highlights": [
                "Designed and deployed scalable, secure AWS infrastructures across industries using EC2, VPC, S3, RDS, Lambda, CloudFront.",
                "Built containerized microservices on Docker, EKS and ECS Fargate.",
                "Authored Terraform and CloudFormation modules for repeatable, automated deployments.",
                "Implemented end-to-end CI/CD with Jenkins, GitHub Actions, GitLab CI/CD.",
                "Integrated DevSecOps controls — IAM, Secrets Manager, vulnerability scanning.",
                "Set up observability with CloudWatch, Prometheus, Grafana, SLO-based alerting.",
                "Optimized cloud cost via rightsizing, Auto Scaling and Spot Instances.",
            ],
        },
        {
            "company": "Cognizant",
            "role": "Senior AWS Cloud DevOps Engineer",
            "location": "Noida",
            "start": "Aug 2023",
            "end": "Jul 2024",
            "highlights": [
                "Built scalable CI/CD pipelines (Jenkins, GitHub Actions, AWS CodePipeline) for microservices.",
                "Managed multi-environment AWS infra via Terraform and CloudFormation.",
                "Operated highly available EKS clusters with Helm and Argo CD (GitOps).",
                "Implemented secure VPCs with private subnets, NAT gateways, least-privilege IAM.",
                "Enhanced observability via CloudWatch dashboards, alerts, centralized logging.",
                "Reduced cloud cost through Auto Scaling, Spot Instances, cost analysis.",
            ],
        },
        {
            "company": "Infosys",
            "role": "Senior DevOps Engineer (AWS)",
            "location": "Noida",
            "start": "Sep 2021",
            "end": "Aug 2023",
            "highlights": [
                "Led migration of legacy on-prem systems to AWS using cloud-native patterns.",
                "Authored reusable Terraform modules for scalable infra provisioning.",
                "Built CI/CD pipelines for containerized workloads on EKS and ECS.",
                "Integrated SonarQube, Trivy, Snyk into pipelines.",
                "Shipped blue-green and canary deployments on Kubernetes.",
                "Established centralized monitoring with CloudWatch, Prometheus, Grafana.",
            ],
        },
        {
            "company": "Moksa Technologies",
            "role": "DevOps Engineer",
            "location": "Gurugram",
            "start": "Dec 2017",
            "end": "Sep 2021",
            "highlights": [
                "Managed AWS production environments (EC2, S3, RDS, IAM, ELB).",
                "Automated operations using Python and Bash scripting.",
                "Containerized applications with Docker and supported cloud deployments.",
                "Built CI pipelines using Jenkins and Git.",
                "Performed patching, security hardening, and incident troubleshooting.",
            ],
        },
    ],
    "projects": [
        {
            "title": "AWS Cloud Migration",
            "summary": "Migrated legacy on-prem applications to AWS, improving scalability and reliability.",
            "tech": ["AWS", "Terraform", "EC2", "RDS", "VPC"],
            "metric": "Zero-downtime cutover",
            "size": "large",
        },
        {
            "title": "EKS Production Platform",
            "summary": "Designed a secure, highly available EKS platform with GitOps-based deployments via Argo CD.",
            "tech": ["EKS", "Helm", "Argo CD", "Terraform"],
            "metric": "99.95% uptime",
            "size": "wide",
        },
        {
            "title": "Cost Optimization Initiative",
            "summary": "Reduced AWS monthly spend through Spot Instances, rightsizing and auto-scaling.",
            "tech": ["AWS", "Spot", "Auto Scaling"],
            "metric": "~20% saved",
            "size": "small",
        },
        {
            "title": "CI/CD Modernization",
            "summary": "Replaced legacy Jenkins jobs with scalable, secure pipelines on GitHub Actions.",
            "tech": ["GitHub Actions", "Trivy", "SonarQube"],
            "metric": "3x faster releases",
            "size": "tall",
        },
    ],
    "certifications": [
        {"name": "AWS Certified Solutions Architect", "issuer": "Amazon Web Services", "status": "In Progress", "year": "2025"},
        {"name": "Certified Kubernetes Administrator (CKA)", "issuer": "CNCF", "status": "Planned", "year": "2025"},
        {"name": "HashiCorp Certified: Terraform Associate", "issuer": "HashiCorp", "status": "Planned", "year": "2025"},
    ],
    "education": [
        {"degree": "B.Tech in Computer Science", "institution": "University of Petroleum and Energy Studies, Dehradun", "year": "2015"},
    ],
    "social": {
        "github": "https://github.com/",
        "linkedin": "https://www.linkedin.com/",
        "email": "anshul123bisht@gmail.com",
    },
}


# -------------------- Routes: Health --------------------
@api_router.get("/")
async def root():
    """Docstring for root."""
    return {"message": "Anshul Bisht Portfolio API", "status": "ok"}


# -------------------- Routes: Portfolio --------------------
PORTFOLIO_SECTIONS = {
    "profile", "stats", "skills", "experience",
    "projects", "certifications", "education", "social",
}


async def get_portfolio_doc():
    """Docstring for get_portfolio_doc."""
    doc = await db.portfolio_content.find_one(
        {"key": "main"}, {"_id": 0, "key": 0}
    )
    if doc:
        return doc
    return PORTFOLIO_DATA


@api_router.get("/portfolio")
async def get_portfolio():
    """Docstring for get_portfolio."""
    return await get_portfolio_doc()


@api_router.get("/admin/portfolio")
async def admin_get_portfolio(user: dict = Depends(get_current_user)):
    """Docstring for admin_get_portfolio."""
    return await get_portfolio_doc()


@api_router.put("/admin/portfolio/{section}")
async def admin_update_portfolio_section(
    section: str,
    payload: dict,
    user: dict = Depends(get_current_user),
):
    """Docstring for admin_update_portfolio_section."""
    if section not in PORTFOLIO_SECTIONS:
        raise HTTPException(status_code=400, detail="Invalid section")
    if "data" not in payload:
        raise HTTPException(status_code=400, detail="Missing 'data' in body")
    await db.portfolio_content.update_one(
        {"key": "main"},
        {"$set": {section: payload["data"]}},
        upsert=True,
    )
    doc = await get_portfolio_doc()
    return {"ok": True, "section": section, "value": doc.get(section)}


# -------------------- Routes: Auth --------------------
@api_router.post("/auth/login")
async def login(payload: LoginRequest, request: Request, response: Response):
    """Docstring for login."""
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # Brute-force check
    attempt = await db.login_attempts.find_one({"identifier": identifier}, {"_id": 0})
    now = datetime.now(timezone.utc)
    if attempt and attempt.get("count", 0) >= MAX_LOGIN_ATTEMPTS:
        locked_until = datetime.fromisoformat(attempt["locked_until"]) if attempt.get("locked_until") else None
        if locked_until and locked_until > now:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        # Increment attempts
        new_count = (attempt.get("count", 0) if attempt else 0) + 1
        update = {"count": new_count, "identifier": identifier}
        if new_count >= MAX_LOGIN_ATTEMPTS:
            update["locked_until"] = (now + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Reset attempts
    await db.login_attempts.delete_one({"identifier": identifier})

    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)

    return {
        "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]},
        "access_token": access,
    }


@api_router.post("/auth/logout")
async def logout(response: Response):
    """Docstring for logout."""
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    """Docstring for auth_me."""
    return user


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    """Docstring for refresh_token."""
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=SECURE_COOKIES, samesite="lax",
                            max_age=ACCESS_TOKEN_MINUTES * 60, path="/")
        return {"access_token": access}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# -------------------- Routes: Contact --------------------
@api_router.post("/contact")
async def submit_contact(payload: ContactSubmissionCreate):
    """Docstring for submit_contact."""
    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "subject": (payload.subject or "").strip(),
        "message": payload.message.strip(),
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contact_submissions.insert_one(doc)
    # Email notification: MOCKED — logs to backend log until Resend/SendGrid key is provided
    logger.info(f"[CONTACT MOCK EMAIL] New message received. ID: {doc['id']}")
    return {"ok": True, "id": doc["id"]}


@api_router.get("/admin/contacts")
async def list_contacts(user: dict = Depends(get_current_user)):
    """Docstring for list_contacts."""
    items = await db.contact_submissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api_router.patch("/admin/contacts/{contact_id}/read")
async def mark_contact_read(contact_id: str, user: dict = Depends(get_current_user)):
    """Docstring for mark_contact_read."""
    result = await db.contact_submissions.update_one({"id": contact_id}, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"ok": True}


@api_router.delete("/admin/contacts/{contact_id}")
async def delete_contact(contact_id: str, user: dict = Depends(get_current_user)):
    """Docstring for delete_contact."""
    result = await db.contact_submissions.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"ok": True}


# -------------------- Routes: Blog --------------------
@api_router.get("/blog")
async def list_blog(published_only: bool = True):
    """Docstring for list_blog."""
    query = {"published": True} if published_only else {}
    items = await db.blog_posts.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api_router.get("/blog/{slug}")
async def get_blog(slug: str):
    """Docstring for get_blog."""
    item = await db.blog_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Post not found")
    return item


@api_router.get("/admin/blog")
async def list_admin_blog(user: dict = Depends(get_current_user)):
    """Docstring for list_admin_blog."""
    items = await db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return items


@api_router.post("/admin/blog")
async def create_blog(payload: BlogPostCreate, user: dict = Depends(get_current_user)):
    """Docstring for create_blog."""
    now_iso = datetime.now(timezone.utc).isoformat()
    base_slug = slugify(payload.title) or str(uuid.uuid4())[:8]
    slug = base_slug
    i = 1
    while await db.blog_posts.find_one({"slug": slug}):
        i += 1
        slug = f"{base_slug}-{i}"
    doc = {
        "id": str(uuid.uuid4()),
        "title": payload.title.strip(),
        "slug": slug,
        "excerpt": payload.excerpt.strip(),
        "content": payload.content.strip(),
        "tags": payload.tags,
        "cover_image": payload.cover_image,
        "published": payload.published,
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    await db.blog_posts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/blog/{post_id}")
async def update_blog(post_id: str, payload: BlogPostUpdate, user: dict = Depends(get_current_user)):
    """Docstring for update_blog."""
    existing = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "title" in updates and updates["title"] != existing["title"]:
        base_slug = slugify(updates["title"]) or str(uuid.uuid4())[:8]
        slug = base_slug
        i = 1
        while await db.blog_posts.find_one({"slug": slug, "id": {"$ne": post_id}}):
            i += 1
            slug = f"{base_slug}-{i}"
        updates["slug"] = slug
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.blog_posts.update_one({"id": post_id}, {"$set": updates})
    updated = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    return updated


@api_router.delete("/admin/blog/{post_id}")
async def delete_blog(post_id: str, user: dict = Depends(get_current_user)):
    """Docstring for delete_blog."""
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"ok": True}


# -------------------- Admin AI Engine Settings --------------------
class AISettingsUpdate(BaseModel):
    provider: str = Field(..., description="Active AI provider: 'groq', 'gemini', or 'auto'")


@api_router.get("/admin/ai-settings")
async def get_ai_settings(user: dict = Depends(get_current_user)):
    """Retrieve current AI engine settings."""
    from ai_assistant import get_ai_provider
    doc = await db.ai_settings.find_one({"key": "config"}, {"_id": 0})
    provider = doc.get("provider", get_ai_provider()) if doc else get_ai_provider()
    return {
        "provider": provider,
        "available_providers": [
            {
                "id": "auto",
                "name": "Auto (Groq Primary + Gemini Fallback)",
                "description": "Recommended: Blazing 0.4s Groq speed with 14,400 free requests/day, auto-fails over to Gemini."
            },
            {
                "id": "groq",
                "name": "Groq LPU Engine",
                "description": "Direct Groq inference (Qwen 3.8 / GPT-OSS 120B) with 14,400 free requests/day."
            },
            {
                "id": "gemini",
                "name": "Google Gemini",
                "description": "Direct Google Generative AI (Gemini 3.5 Flash Lite) with 500 free requests/day."
            }
        ],
        "groq_configured": bool(os.environ.get("GROQ_API_KEY")),
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY")),
        "updated_at": doc.get("updated_at") if doc else None,
        "updated_by": doc.get("updated_by") if doc else None
    }


@api_router.put("/admin/ai-settings")
async def update_ai_settings(payload: AISettingsUpdate, user: dict = Depends(get_current_user)):
    """Switch active AI engine between groq, gemini, and auto."""
    if payload.provider not in ("groq", "gemini", "auto"):
        raise HTTPException(status_code=400, detail="Invalid provider. Must be 'groq', 'gemini', or 'auto'")

    from ai_assistant import set_ai_provider
    set_ai_provider(payload.provider)

    doc = {
        "key": "config",
        "provider": payload.provider,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("email")
    }
    await db.ai_settings.update_one({"key": "config"}, {"$set": doc}, upsert=True)
    return {"message": f"Active AI provider switched to {payload.provider}", "provider": payload.provider}


# -------------------- Wire app --------------------
app.include_router(api_router)
app.include_router(ai_router)

# Allowed CORS origins
cors_origins_env = os.environ.get("FRONTEND_URL", "")
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://gitanshulbisht.github.io",
]
if cors_origins_env:
    for origin in cors_origins_env.split(","):
        origin = origin.strip()
        if origin and origin not in allowed_origins:
            allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- Startup --------------------
async def seed_admin():
    """Docstring for seed_admin."""
    admin_email_env = os.environ.get("ADMIN_EMAIL")
    admin_password_env = os.environ.get("ADMIN_PASSWORD")

    if not admin_email_env or not admin_password_env:
        raise ValueError("ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set.")

    admin_email = admin_email_env.lower().strip()
    admin_password = admin_password_env
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        doc = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Anshul Bisht",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        logger.info(f"Seeded admin user: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Updated admin password for: {admin_email}")


async def seed_demo_blog_posts():
    """Docstring for seed_demo_blog_posts."""
    count = await db.blog_posts.count_documents({})
    if count > 0:
        return
    now_iso = datetime.now(timezone.utc).isoformat()
    posts = [
        {
            "id": str(uuid.uuid4()),
            "title": "Designing Highly Available EKS Clusters in Production",
            "slug": "designing-ha-eks-clusters",
            "excerpt": "Patterns and pitfalls when running mission-critical workloads on Amazon EKS with Argo CD and Helm.",
            "content": "Running EKS in production demands more than `eksctl create cluster`. In this post I cover multi-AZ node groups, pod disruption budgets, cluster autoscaler tuning, and the GitOps wiring with Argo CD that has kept clusters at 99.95% uptime across multiple engagements.\n\nKey topics:\n- Multi-AZ node groups and topology spread constraints\n- PodDisruptionBudgets that actually protect SLOs\n- Argo CD app-of-apps pattern\n- Secrets management via External Secrets + AWS Secrets Manager\n- Observability with Prometheus, Grafana and CloudWatch",
            "tags": ["EKS", "Kubernetes", "AWS", "GitOps"],
            "cover_image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80",
            "published": True,
            "created_at": now_iso,
            "updated_at": now_iso,
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Cutting AWS Spend by 20% Without Sacrificing Reliability",
            "slug": "cutting-aws-spend-20-percent",
            "excerpt": "A pragmatic playbook combining Spot, rightsizing, Savings Plans and architectural cleanup.",
            "content": "Cost is a feature. Here's the exact playbook I use to reduce AWS bills by ~20% across teams — without sacrificing the reliability SLOs we promised.\n\nThe four levers:\n1. Rightsizing with CloudWatch + Compute Optimizer\n2. Spot for stateless workloads, with proper interruption handling\n3. Savings Plans for predictable baseline\n4. Architectural cleanup (idle ELBs, orphaned EBS, NAT egress)\n\nThe last lever is usually the biggest unexpected win.",
            "tags": ["AWS", "FinOps", "Cost"],
            "cover_image": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80",
            "published": True,
            "created_at": now_iso,
            "updated_at": now_iso,
        },
        {
            "id": str(uuid.uuid4()),
            "title": "From Jenkins to GitHub Actions: A Migration Field Guide",
            "slug": "jenkins-to-github-actions-migration",
            "excerpt": "Lessons learned modernizing legacy Jenkins pipelines for a portfolio of microservices.",
            "content": "Legacy Jenkins jobs are great at one thing: building technical debt. Here's how I replace them with composable, secure GitHub Actions workflows that ship 3x faster.\n\nWhat to keep, what to rewrite, and how to do it without freezing deployments for a month.",
            "tags": ["CI/CD", "GitHub Actions", "Jenkins"],
            "cover_image": "https://images.pexels.com/photos/34803969/pexels-photo-34803969.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
            "published": True,
            "created_at": now_iso,
            "updated_at": now_iso,
        },
    ]
    await db.blog_posts.insert_many(posts)
    logger.info(f"Seeded {len(posts)} demo blog posts")


async def seed_portfolio_content():
    """Docstring for seed_portfolio_content."""
    existing = await db.portfolio_content.find_one({"key": "main"})
    if existing is None:
        doc = {"key": "main", **PORTFOLIO_DATA}
        await db.portfolio_content.insert_one(doc)
        logger.info("Seeded portfolio_content with hardcoded defaults")


@app.on_event("startup")
async def on_startup():
    """Docstring for on_startup."""
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier", unique=True)
    await db.blog_posts.create_index("slug", unique=True)
    await db.portfolio_content.create_index("key", unique=True)
    await db.ai_settings.create_index("key", unique=True)
    # Seeds
    await seed_admin()
    await seed_demo_blog_posts()
    await seed_portfolio_content()

    # Load active AI engine setting
    try:
        from ai_assistant import set_ai_provider
        ai_doc = await db.ai_settings.find_one({"key": "config"})
        if ai_doc and "provider" in ai_doc:
            set_ai_provider(ai_doc["provider"])
            logger.info(f"Loaded active AI provider from database: {ai_doc['provider']}")
    except Exception as e:
        logger.warning(f"Could not load AI settings on startup: {e}")


@app.on_event("shutdown")
async def on_shutdown():
    """Docstring for on_shutdown."""
    client.close()
