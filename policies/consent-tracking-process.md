# Consent Tracking Process

**Version:** 1.0
**Effective Date:** 2026-04-14
**Last Reviewed:** 2026-04-14
**Owner:** Chris Rogers

## 1. Purpose

This document defines how Really Personal Finance obtains, records, and manages user consent for accessing and processing consumer financial data via Plaid.

## 2. Consent Types

| Type | Identifier | When Obtained | Required For |
|---|---|---|---|
| Plaid Data Access | `plaid_data_access` | Before Plaid Link flow | Connecting bank accounts, syncing transactions |
| Privacy Policy | `privacy_policy` | At registration | Using the service |
| Terms of Service | `tos` | At registration | Using the service |

## 3. Consent Collection Flow

### 3.1 Registration
1. User signs up via email magic link or Google OAuth
2. User is presented with Privacy Policy and Terms of Service
3. User must explicitly accept both to proceed
4. Consent recorded via `POST /api/consent` with type, version, and IP address

### 3.2 Plaid Link
1. User initiates bank account connection
2. Application presents data access consent screen explaining:
   - What data will be accessed (account info, transactions)
   - How data will be used (aggregation, categorization, analytics)
   - How data will be stored (encrypted, per-user isolation)
   - How to revoke access
3. User grants `plaid_data_access` consent
4. Consent recorded before Plaid Link flow begins
5. Plaid's own consent UI provides additional user authorization

## 4. Consent Storage

Consent records are stored in the `consent_records` table:

| Field | Description |
|---|---|
| `user_id` | The user who granted consent |
| `consent_type` | Type identifier (e.g., `plaid_data_access`) |
| `version` | Policy version the user consented to |
| `granted_at` | Timestamp of consent |
| `revoked_at` | Timestamp of revocation (null if active) |
| `ip_address` | IP address at time of consent |

- Each consent grant creates a new record
- Revoking consent sets `revoked_at` on the active record (never deletes)
- Full history is preserved for auditing

## 5. Consent Verification

Before performing consent-gated operations, the application checks:
- `GET /api/consent` — Returns all active consents for the authenticated user
- `hasActiveConsent(userId, consentType)` — Programmatic check in application code

Plaid Link token creation should verify active `plaid_data_access` consent before proceeding.

## 6. Consent Revocation

Users can revoke consent at any time:

1. Via API: `POST /api/consent` with `{ "consentType": "plaid_data_access", "action": "revoke" }`
2. Via account settings (UI)

Upon revoking `plaid_data_access` consent:
- No new Plaid syncs will be initiated
- Existing data remains until the user requests deletion
- User is informed that existing data is retained unless explicitly deleted

## 7. Re-consent

When policy versions are updated:
1. Users are notified of the updated policy
2. New consent must be obtained for the new version
3. Previous consent records remain in history (with `revoked_at` set)
4. Service access may be limited until re-consent is obtained

## 8. Consent History & Auditing

- Users can view their consent history via `GET /api/consent/history`
- All consent events are logged in the audit trail:
  - `consent.granted` — Records type, version, IP
  - `consent.revoked` — Records type
- Consent records are retained for 7 years after revocation

## 9. API Reference

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/consent` | GET | List active consents |
| `POST /api/consent` | POST | Grant or revoke consent |
| `GET /api/consent/history` | GET | Full consent history |

### Grant consent:
```json
POST /api/consent
{
  "consentType": "plaid_data_access",
  "version": "1.0"
}
```

### Revoke consent:
```json
POST /api/consent
{
  "consentType": "plaid_data_access",
  "action": "revoke"
}
```

## 10. Policy Review

This process is reviewed annually or when consent requirements change due to regulatory updates or changes in data processing activities.
