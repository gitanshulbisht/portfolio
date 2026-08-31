"""Backend integration tests for Anshul Bisht Portfolio API.

Covers: portfolio, auth (login/me/logout/refresh/lockout), contact CRUD,
blog public + admin CRUD with slug uniqueness.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://devops-react-spring.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@anshulbisht.dev")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "DevOps@2025")


# -------------------- Fixtures --------------------
@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(api_client):
    r = api_client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


# -------------------- Health / Portfolio --------------------
class TestPortfolio:
    def test_root(self, api_client):
        r = api_client.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_portfolio_structure(self, api_client):
        r = api_client.get(f"{API}/portfolio")
        assert r.status_code == 200
        d = r.json()
        # profile
        assert d["profile"]["name"] == "Anshul Bisht"
        assert d["profile"]["years_experience"] == 7
        # 8 skills categories
        assert len(d["skills"]) == 8
        # 4 jobs
        assert len(d["experience"]) == 4
        # 4 projects
        assert len(d["projects"]) == 4
        # certifications
        assert len(d["certifications"]) >= 3
        # stats
        assert len(d["stats"]) == 4
        # social
        assert "email" in d["social"]


# -------------------- Auth --------------------
class TestAuth:
    def test_login_success(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        assert isinstance(data["access_token"], str) and len(data["access_token"]) > 20
        # cookies set
        cookie_names = {c.name for c in r.cookies}
        assert "access_token" in cookie_names
        assert "refresh_token" in cookie_names

        # Verify secure flag
        expected_secure = os.environ.get("EXPECTED_SECURE_COOKIES", "false").lower() == "true"
        for c in r.cookies:
            if c.name in {"access_token", "refresh_token"}:
                assert c.secure is expected_secure

    def test_login_wrong_password(self, api_client):
        r = api_client.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass!"})
        assert r.status_code == 401

    def test_auth_me_with_bearer(self, api_client, auth_token):
        r = api_client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL
        assert "password_hash" not in u

    def test_auth_me_no_token(self, api_client):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout_clears_cookies(self, api_client):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        assert s.cookies.get("access_token")
        r2 = s.post(f"{API}/auth/logout")
        assert r2.status_code == 200
        # Server should have sent Set-Cookie to expire cookies
        set_cookie_headers = r2.headers.get("set-cookie", "")
        assert "access_token" in set_cookie_headers

    def test_brute_force_lockout(self, api_client):
        """Use a non-admin email so we don't lock out the real admin."""
        fake_email = f"locktest+{uuid.uuid4().hex[:6]}@example.com"
        last = None
        for i in range(6):
            last = requests.post(f"{API}/auth/login", json={"email": fake_email, "password": "badpass"})
        # After 5 failures, 6th should return 429 (lockout)
        assert last.status_code == 429, f"Expected 429 after lockout, got {last.status_code}: {last.text}"


# -------------------- Contact --------------------
class TestContact:
    def test_submit_contact_valid(self, api_client):
        payload = {
            "name": "TEST_User",
            "email": "TEST_contact@example.com",
            "subject": "TEST subject",
            "message": "TEST message body",
        }
        r = api_client.post(f"{API}/contact", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert "id" in d
        TestContact.created_id = d["id"]

    def test_submit_contact_invalid_email(self, api_client):
        r = api_client.post(f"{API}/contact", json={
            "name": "X", "email": "not-an-email", "message": "hi"
        })
        assert r.status_code == 422

    def test_admin_list_contacts_requires_auth(self, api_client):
        r = requests.get(f"{API}/admin/contacts")
        assert r.status_code == 401

    def test_admin_list_contacts(self, api_client, auth_headers):
        r = api_client.get(f"{API}/admin/contacts", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        ids = [i["id"] for i in items]
        assert getattr(TestContact, "created_id", None) in ids

    def test_admin_mark_read(self, api_client, auth_headers):
        cid = getattr(TestContact, "created_id", None)
        assert cid
        r = api_client.patch(f"{API}/admin/contacts/{cid}/read", headers=auth_headers)
        assert r.status_code == 200
        # verify
        r2 = api_client.get(f"{API}/admin/contacts", headers=auth_headers)
        item = next(i for i in r2.json() if i["id"] == cid)
        assert item["read"] is True

    def test_admin_delete_contact(self, api_client, auth_headers):
        cid = getattr(TestContact, "created_id", None)
        r = api_client.delete(f"{API}/admin/contacts/{cid}", headers=auth_headers)
        assert r.status_code == 200
        r2 = api_client.get(f"{API}/admin/contacts", headers=auth_headers)
        ids = [i["id"] for i in r2.json()]
        assert cid not in ids


# -------------------- Blog --------------------
class TestBlog:
    def test_list_public_blog(self, api_client):
        r = api_client.get(f"{API}/blog")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 3
        # store a known slug
        TestBlog.public_slug = items[0]["slug"]

    def test_get_blog_by_slug(self, api_client):
        # use a known seeded slug
        r = api_client.get(f"{API}/blog/designing-ha-eks-clusters")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "designing-ha-eks-clusters"
        assert d["published"] is True

    def test_get_blog_404(self, api_client):
        r = api_client.get(f"{API}/blog/nope-{uuid.uuid4().hex[:6]}")
        assert r.status_code == 404

    def test_admin_create_blog(self, api_client, auth_headers):
        title = f"TEST Post {uuid.uuid4().hex[:6]}"
        payload = {
            "title": title,
            "excerpt": "test excerpt",
            "content": "test content body",
            "tags": ["test"],
            "published": True,
        }
        r = api_client.post(f"{API}/admin/blog", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == title
        assert d["slug"].startswith("test-post-")
        assert "id" in d
        TestBlog.post_id = d["id"]
        TestBlog.post_slug = d["slug"]

    def test_admin_create_duplicate_slug_unique(self, api_client, auth_headers):
        # Create with same title to force duplicate slug suffix
        original_title = "TEST Duplicate Slug Title XYZ"
        r1 = api_client.post(f"{API}/admin/blog", json={
            "title": original_title, "excerpt": "e", "content": "c", "published": True
        }, headers=auth_headers)
        assert r1.status_code == 200
        slug1 = r1.json()["slug"]
        r2 = api_client.post(f"{API}/admin/blog", json={
            "title": original_title, "excerpt": "e", "content": "c", "published": True
        }, headers=auth_headers)
        assert r2.status_code == 200
        slug2 = r2.json()["slug"]
        assert slug1 != slug2
        # cleanup
        api_client.delete(f"{API}/admin/blog/{r1.json()['id']}", headers=auth_headers)
        api_client.delete(f"{API}/admin/blog/{r2.json()['id']}", headers=auth_headers)

    def test_admin_blog_requires_auth(self, api_client):
        r = requests.post(f"{API}/admin/blog", json={"title": "x", "excerpt": "x", "content": "x"})
        assert r.status_code == 401

    def test_get_created_post_public(self, api_client):
        slug = getattr(TestBlog, "post_slug", None)
        r = api_client.get(f"{API}/blog/{slug}")
        assert r.status_code == 200
        assert r.json()["slug"] == slug

    def test_admin_update_blog(self, api_client, auth_headers):
        pid = getattr(TestBlog, "post_id", None)
        new_title = f"TEST Updated {uuid.uuid4().hex[:6]}"
        r = api_client.put(f"{API}/admin/blog/{pid}", json={"title": new_title}, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == new_title
        assert d["slug"].startswith("test-updated-")
        # verify via GET by new slug
        r2 = api_client.get(f"{API}/blog/{d['slug']}")
        assert r2.status_code == 200

    def test_admin_delete_blog(self, api_client, auth_headers):
        pid = getattr(TestBlog, "post_id", None)
        r = api_client.delete(f"{API}/admin/blog/{pid}", headers=auth_headers)
        assert r.status_code == 200
        # ensure gone
        r2 = api_client.delete(f"{API}/admin/blog/{pid}", headers=auth_headers)
        assert r2.status_code == 404
