# Auth Testing Playbook

## MongoDB Verification
```
mongosh
use devops_portfolio
db.users.find({role: "admin"}).pretty()
```
Verify: bcrypt hash starts with `$2b$`, indexes exist on users.email (unique), login_attempts.identifier, password_reset_tokens.expires_at (TTL).

## API Testing (Local Development)
```
# Replace with your local test credentials
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@anshulbisht.dev","password":"DevOps@2025"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
```

Login should return the user and set `access_token` + `refresh_token` cookies.

## Bearer Token Alternative
The frontend also stores access_token in localStorage and sends `Authorization: Bearer <token>` header (in addition to cookies) for cross-origin reliability.
