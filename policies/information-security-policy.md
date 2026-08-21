# Information Security Policy

**Version:** 1.1
**Effective Date:** 2026-04-14
**Last Reviewed:** 2026-08-21
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
- EOL tracking and upgrade windows are defined in `policies/eol-software-policy.md`, which owns this control.
- First lifecycle review executed 2026-08-20. It found CI running Node.js 20 past its 2026-04-30 end of life; remediated to Node 22 on 2026-08-21 (PRs #162, #170). The production runtime is not yet pinned in-repository (EOL policy §8.2).
- Automated EOL monitoring is not yet implemented; reviews are manual and quarterly per the EOL policy.

### 7.3 Vulnerability Scanning
- `npm audit` runs as a CI gate on every pull request and push to `main` (fails the build on Critical advisories; `.github/workflows/ci.yml`, job `audit`).
- A scheduled scan runs weekly at High severity (`.github/workflows/security-scan.yml`, Mondays 09:00 UTC). Its first run (2026-08-21) correctly failed at the production-dependency gate on the open High advisory tracked as EX-001 in `policies/vulnerability-patching-policy.md` — the sole advisory in that step's report, affecting three packages in the `nodemailer` → `@auth/core` → `next-auth` chain.
- Dependabot **version updates** run weekly (`.github/dependabot.yml`; first grouped update merged as #165).
- Dependabot **security alerts and security updates are currently disabled** (measured 2026-08-21). Enabling them is tracked in `policies/vulnerability-scanning-policy.md` §8.1.
- Manual security audits were conducted in July and August 2026; findings are tracked as repository issues.

## 8. Secure Development

- Source code stored in a public GitHub repository (visibility re-confirmed 2026-08-21; whether it remains public is under owner review — `policies/vulnerability-scanning-policy.md` §8.4)
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

## Revision History

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-08-21 | §7.2, §7.3 and §8 corrected to the measured state of the controls (issue #160): EOL monitoring re-homed to the dedicated policy with the Node 20 finding and its remediation recorded; scanning restated as what actually runs, with Dependabot alerts stated as disabled; repository visibility corrected from private to public. No control was changed by this revision — the document now describes what exists. |
| 1.0 | 2026-04-14 | Original accepted version. |
