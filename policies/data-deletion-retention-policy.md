# Data Deletion and Retention Policy

**Version:** 1.0
**Effective Date:** 2026-04-14
**Last Reviewed:** 2026-04-14
**Owner:** Chris Rogers

## 1. Purpose

This policy defines how consumer data is retained, archived, and deleted within Really Personal Finance, ensuring compliance with Plaid's data security requirements and applicable privacy regulations.

## 2. Scope

Applies to all consumer data stored in the application:
- User profiles and authentication data
- Financial data (accounts, transactions)
- Plaid integration data (access tokens, sync cursors)
- Consent records
- Configuration data (column mappings, Telegram settings)
- Audit logs

## 3. Retention Schedule

| Data Category | Retention Period | Justification |
|---|---|---|
| Active user profiles | While account is active | Required for service operation |
| Financial transactions | While account is active | Core application data |
| Plaid access tokens (encrypted) | While account is active | Required for transaction sync |
| Consent records | 7 years after revocation | Legal/compliance requirement |
| Audit logs | 7 years | Regulatory compliance, incident investigation |
| Deleted user profile (SCD2 history) | 7 years | Audit trail preservation |
| Session data | Until expiry or logout | Authentication only |
| Verification tokens | Until used or expired | One-time use authentication |

## 4. Data Deletion

### 4.1 User-Initiated Deletion

Users can request full account deletion via `POST /api/data/delete`. This action:

1. Deletes all financial transactions
2. Deletes all bank account records (including encrypted Plaid tokens)
3. Deletes consent records
4. Deletes column mappings and Telegram configuration
5. Deletes MFA credentials
6. Invalidates all active sessions
7. Removes OAuth account links
8. Soft-deletes user profile (SCD2: sets `is_current = false`, `valid_to = now`)

**Confirmation required**: Request must include `{ "confirmation": "DELETE_ALL_MY_DATA" }`.

### 4.2 Admin-Initiated Deletion

Administrators with `owner` role can deprovision users via `PATCH /api/admin/users`. This:
- Soft-deletes the user profile
- Does not delete financial data (admin must coordinate with user)
- Logs the deprovisioning action in audit trail

### 4.3 Data Export Before Deletion

Users can export all their data via `GET /api/data/export` before requesting deletion. The export includes:
- User profile history
- All accounts (without encrypted tokens)
- All transactions
- Consent history
- Column mappings
- Telegram configuration

### 4.4 What Is NOT Deleted

The following are retained after account deletion for compliance:
- **Audit logs** referencing the user (retained for 7 years)
- **SCD2 user history** (soft-deleted records with `is_current = false`)

These retained records enable incident investigation and compliance auditing.

## 5. Plaid Token Handling

- Plaid access tokens are encrypted with AES-256-GCM before storage
- Tokens are only decrypted during active transaction sync operations
- Upon account deletion, encrypted tokens are permanently deleted from the database
- Plaid is notified to invalidate the item (TODO: implement Plaid item removal API call)

## 6. Inactive Account Policy

- Accounts with no login activity for 24 months are flagged as inactive
- A 30-day notice is sent before deletion
- If no response, the account is deprovisioned following the standard deletion process

## 7. Backup & Recovery

- Database backups are managed by Neon's point-in-time recovery (PITR)
- Backups follow the same retention schedule as live data
- Deleted data may persist in backups for up to Neon's PITR window (7 days default)
- After the PITR window, deleted data is purged from all backups

## 8. Implementation

Deletion is implemented at the application layer:
- `POST /api/data/delete` — User-initiated full deletion
- `PATCH /api/admin/users` — Admin deprovisioning
- Audit logging records all deletion events
- No manual database access required for standard deletion

## 9. Policy Review

This policy is reviewed annually or when changes are made to data storage, retention requirements, or regulatory obligations.
