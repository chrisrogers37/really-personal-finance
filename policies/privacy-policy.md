# Privacy Policy

**Version:** 1.0
**Effective Date:** 2026-04-14
**Last Updated:** 2026-04-14

## 1. Introduction

Really Personal Finance ("we", "us", "our") is a personal financial management application. This privacy policy explains how we collect, use, store, and protect your personal and financial information when you use our service.

## 2. Information We Collect

### 2.1 Account Information
- Email address (for authentication)
- Name (optional)
- Google account identifiers (if using Google sign-in)

### 2.2 Financial Data (via Plaid)
When you connect a bank account through Plaid, we receive:
- Account names, types, and masked account numbers
- Transaction history (amounts, dates, merchant names, categories)
- Account balances

We do **not** receive or store your bank login credentials. Plaid handles authentication directly with your financial institution.

### 2.3 Automatically Collected
- IP address (for security audit logging)
- User agent (browser/device information, for audit logging)
- Session data (authentication tokens)

### 2.4 Imported Data
- CSV/OFX files you manually upload containing transaction data
- Column mapping preferences for imports

## 3. How We Use Your Information

We use your information solely to:
- **Provide the service**: Display your financial data, categorize transactions, generate analytics
- **Authenticate you**: Verify your identity via email magic links, Google OAuth, or MFA
- **Sync your data**: Periodically fetch new transactions from connected bank accounts via Plaid
- **Send alerts**: Deliver Telegram notifications you've configured
- **Ensure security**: Log access events, detect unauthorized use, maintain audit trails

We do **not**:
- Sell your personal or financial data to third parties
- Use your data for advertising
- Share your data with other users
- Use your data for credit decisions
- Train AI models on your financial data

## 4. Data Storage & Security

### 4.1 Where Data Is Stored
- Application hosted on Vercel (US)
- Database hosted on Neon PostgreSQL (US)
- All infrastructure uses HTTPS/TLS encryption in transit

### 4.2 Encryption
- Plaid access tokens encrypted at rest using AES-256-GCM
- Database connections secured with SSL
- All web traffic encrypted via HTTPS

### 4.3 Access Controls
- Role-based access control (RBAC) limits who can view/modify data
- All database queries scoped to your authenticated user ID
- Multi-factor authentication (TOTP) available
- Sessions are database-backed with automatic expiry

## 5. Data Sharing

We share your data only with:

| Third Party | Purpose | Data Shared |
|---|---|---|
| **Plaid** | Bank account connectivity | Account and transaction data (via their API) |
| **Vercel** | Application hosting | Application logs (no financial data) |
| **Neon** | Database hosting | Encrypted financial data at rest |
| **Google** | OAuth authentication | Email address for sign-in |
| **SMTP Provider** | Magic link emails | Email address |

We will also disclose data if required by law, court order, or regulatory obligation.

## 6. Consent

We obtain explicit consent before:
- Connecting your bank accounts via Plaid (Plaid Link consent flow)
- Accessing your financial data
- Sending you notifications

You can view your consent history and revoke consent at any time through the consent management API or your account settings.

Consent records include: type of consent, version, timestamp, and IP address.

## 7. Your Rights

You have the right to:

- **Access**: Request a copy of all data we hold about you (`GET /api/data/export`)
- **Deletion**: Request deletion of your account and all associated data (`POST /api/data/delete`)
- **Portability**: Export your data in JSON format
- **Revoke consent**: Disconnect bank accounts and revoke data access consent
- **Opt out**: Disable notifications, disconnect accounts

To exercise these rights, use the in-app settings or contact us.

## 8. Data Retention

- **Active accounts**: Data retained while your account is active
- **Deleted accounts**: Financial data purged immediately upon account deletion; audit logs retained for 7 years
- **Inactive accounts**: Accounts inactive for 24 months may be subject to deletion with 30 days notice

See our [Data Deletion and Retention Policy](./data-deletion-retention-policy.md) for full details.

## 9. Cookies & Sessions

We use:
- **Session cookies**: HTTP-only, secure cookies for authentication (essential, no opt-out)
- **No tracking cookies**: We do not use analytics, advertising, or third-party tracking cookies

## 10. Children's Privacy

This service is not intended for users under 18. We do not knowingly collect data from minors.

## 11. Changes to This Policy

We may update this policy periodically. Material changes will be communicated via email or in-app notification. Continued use of the service after changes constitutes acceptance.

## 12. Contact

For privacy inquiries, contact the application owner through the application's support channel.
