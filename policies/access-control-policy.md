# Access Control Policy

**Version:** 1.0
**Effective Date:** 2026-04-14
**Last Reviewed:** 2026-04-14
**Owner:** Chris Rogers

## 1. Purpose

This policy defines how access to Really Personal Finance systems, data, and infrastructure is managed, granted, reviewed, and revoked.

## 2. Scope

Applies to all access to:
- The application and its APIs
- Database (Neon PostgreSQL)
- Infrastructure (Vercel, GitHub)
- Third-party integrations (Plaid, Google OAuth)

## 3. Access Control Model

### 3.1 Role-Based Access Control (RBAC)

The application implements a four-tier role hierarchy:

| Role | Level | Permissions |
|---|---|---|
| **Owner** | 40 | Full access: manage all users, roles, data, configuration |
| **Admin** | 30 | Manage users, view audit logs, perform access reviews |
| **Member** | 20 | Full access to own financial data, link accounts, manage settings |
| **Viewer** | 10 | Read-only access to own financial data |

- Roles are assigned per user and stored in the `users` table
- Role checks enforced at the API layer via `hasMinRole()` utility
- New users default to `member` role
- Only `owner` can promote users to `admin` or `owner`

### 3.2 Data Isolation

- All database queries include user ID filtering (`WHERE user_id = ?`)
- Users can only access their own financial data
- No cross-user data access is possible at the application level
- Admin endpoints for user management are separate from data endpoints

### 3.3 Zero Trust Principles

- Every API request is authenticated (session validation)
- No implicit trust — every request verified independently
- Cron jobs authenticated via bearer token
- Webhooks verified via timing-safe secret comparison
- Middleware enforces authentication before route handlers execute
- No long-lived tokens — sessions expire and must be refreshed

## 4. Authentication Methods

| Method | Use Case | Security Properties |
|---|---|---|
| Email magic link | Primary consumer login | Passwordless, time-limited token |
| Google OAuth | Alternate consumer login | Delegated authentication with state check |
| TOTP MFA | Second factor | 6-digit time-based code, 30-second window |
| Bearer token | Cron jobs | Server-side secret, rotatable |
| Webhook secret | Telegram | Timing-safe comparison |

## 5. Multi-Factor Authentication

- TOTP-based MFA available for all consumer accounts
- MFA secrets encrypted at rest (AES-256-GCM)
- 8 single-use recovery codes provided at enrollment
- MFA can be enabled/disabled through the API
- MFA verification logged in audit trail

## 6. Centralized Identity Management

All identity and access is managed through NextAuth v5:
- Single authentication gateway for all providers
- Database-backed session management
- Custom adapter for SCD2 user versioning
- Unified session callback that includes role and MFA status

## 7. Access Provisioning & De-provisioning

### 7.1 Provisioning
- Self-registration via email or Google OAuth
- Default role: `member`
- Role elevation requires `owner` approval

### 7.2 De-provisioning
- Users can self-delete via `POST /api/data/delete`
- Admins can deprovision users via `PATCH /api/admin/users` with `action: "deprovision"`
- Deprovisioned users are soft-deleted (SCD2 pattern: `is_current = false`)
- All active sessions invalidated upon deprovisioning
- Financial data purged; audit trail preserved

### 7.3 Automated De-provisioning
- Sessions automatically expire based on configured TTL
- Inactive accounts flagged after 24 months
- Deprovisioned accounts cannot authenticate

## 8. Periodic Access Reviews

- Admin users can review all active users via `GET /api/admin/users`
- Access reviews logged in audit trail (`admin.access_review` action)
- Reviews conducted quarterly (minimum)
- Review checklist:
  - [ ] All active users have appropriate roles
  - [ ] No orphaned accounts
  - [ ] MFA enabled for users with elevated roles
  - [ ] No unexpected admin/owner accounts
  - [ ] Audit logs show no anomalous access patterns

## 9. Infrastructure Access

| System | Access Method | Who |
|---|---|---|
| Vercel | Team SSO + MFA | Owner only |
| Neon Database | Connection string (env var) | Application only |
| GitHub | SSH key + MFA | Owner only |
| Plaid Dashboard | Email + MFA | Owner only |

- No shared credentials
- No direct database shell access in production
- All infrastructure access behind MFA

## 10. Audit Trail

All access control events are logged:
- Login/logout events
- MFA enrollment and verification
- Role changes
- User deprovisioning
- Access reviews
- Failed authentication attempts

Logs retained for 7 years per retention policy.

## 11. Policy Review

This policy is reviewed annually or upon changes to access control mechanisms.
