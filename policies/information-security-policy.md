# Information Security Policy

**Version:** 1.0
**Effective Date:** 2026-04-14
**Last Reviewed:** 2026-04-14
**Owner:** Chris Rogers

## 1. Purpose

This policy establishes the information security requirements for Really Personal Finance, a consumer financial data aggregation application that integrates with Plaid to access user banking data. It ensures the confidentiality, integrity, and availability of consumer financial data.

## 2. Scope

This policy applies to all systems, data, and personnel involved in the development, deployment, and operation of Really Personal Finance, including:

- Application infrastructure (Vercel, Neon PostgreSQL)
- Third-party integrations (Plaid, Google OAuth)
- Source code and development environments
- Consumer financial data (transactions, account information, Plaid tokens)

## 3. Data Classification

| Classification | Description | Examples |
|---|---|---|
| **Critical** | Plaid access tokens, encryption keys | `plaid_access_token`, `ENCRYPTION_KEY` |
| **Sensitive** | Consumer financial data | Transactions, account numbers, balances |
| **Internal** | Application configuration | Database URLs, API keys |
| **Public** | Published policies, app UI | Privacy policy, marketing site |

## 4. Encryption Controls

### 4.1 Encryption at Rest
- Plaid access tokens are encrypted using AES-256-GCM before database storage
- Each encrypted value uses a unique 128-bit initialization vector (IV)
- Authentication tags prevent tampering (GCM mode)
- Encryption keys are stored as environment variables, never in code

### 4.2 Encryption in Transit
- All traffic is served over HTTPS/TLS via Vercel's edge network
- Database connections use SSL (`sslmode=require`)
- Plaid API calls use HTTPS with certificate validation

## 5. Authentication & Access Control

### 5.1 Consumer Authentication
- Email magic links (passwordless) and Google OAuth
- Database-backed sessions with secure HTTP-only cookies
- Multi-factor authentication (TOTP) available for all users
- Sessions expire and are validated on each request

### 5.2 Role-Based Access Control
- Four roles: owner, admin, member, viewer
- Role hierarchy enforced at the API level
- Administrative endpoints require admin role or higher
- All data queries scoped to authenticated user ID

### 5.3 Internal System Access
- Application deployed on Vercel with team-based access
- Database access restricted to application service account
- Cron endpoints protected by bearer token (CRON_SECRET)
- No direct database access in production without audit trail

## 6. Audit Logging

All security-relevant events are logged to the `audit_logs` table:

- Authentication events (login, logout, MFA verification, failures)
- Data access (reads, creates, updates, deletes, exports)
- Plaid operations (link, sync, token access)
- Administrative actions (role changes, user deprovisioning)
- Consent events (granted, revoked)

Audit logs include: user ID, action, resource, IP address, user agent, and timestamp.

## 7. Vulnerability Management

### 7.1 Dependency Management
- Dependencies monitored via `npm audit`
- Critical vulnerabilities patched within 24 hours
- High vulnerabilities patched within 7 days
- Medium/low vulnerabilities patched within 30 days

### 7.2 EOL Software Monitoring
- Runtime versions (Node.js, Next.js) tracked against vendor EOL schedules
- Framework and library versions reviewed quarterly
- EOL components upgraded before support ends

### 7.3 Vulnerability Scanning
- `npm audit` run as part of CI/CD pipeline
- GitHub Dependabot enabled for automated security alerts
- Manual security reviews before major releases

## 8. Secure Development

- Source code stored in private GitHub repository
- All changes go through pull request review
- No secrets committed to source control
- Environment variables used for all configuration
- Input validation on all API endpoints
- Parameterized queries via Drizzle ORM (SQL injection prevention)
- Timing-safe comparison for webhook secret verification

## 9. Incident Response

1. **Detection** — Monitor Vercel logs, audit logs, and Plaid webhooks
2. **Containment** — Rotate affected credentials, disable compromised accounts
3. **Investigation** — Review audit logs, determine scope of impact
4. **Notification** — Notify affected users within 72 hours per regulation
5. **Remediation** — Fix root cause, update security controls
6. **Review** — Post-incident review and policy update

## 10. Data Retention & Deletion

See [Data Deletion and Retention Policy](./data-deletion-retention-policy.md) for full details.

- Active user data retained while account is active
- Deleted user data purged from operational tables immediately
- Audit logs retained for 7 years (compliance requirement)
- User can request full data export or deletion at any time

## 11. Compliance

This policy supports compliance with:
- Plaid's data security requirements (18 attestation areas)
- CCPA/CPRA (California consumer privacy)
- SOC 2 Type II principles (security, availability, confidentiality)

## 12. Policy Review

This policy is reviewed annually or upon significant changes to the application, infrastructure, or regulatory requirements.
