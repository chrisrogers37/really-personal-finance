# Multi-Factor Authentication Policy

**Status:** DRAFT — not submittable. See §9 Open Decisions.
**Version:** 0.2
**Effective Date:** _pending — see §9_
**Last Reviewed:** 2026-08-21
**Owner:** Chris Rogers

## 1. Purpose

This policy defines the multi-factor authentication (MFA) requirements for internal systems that can reach Really Personal Finance consumer data, how those requirements are enforced, and how enforcement is evidenced and reviewed.

It is distinct from consumer-facing MFA, which is a product feature covered in §6.

## 2. Scope

An **internal system in scope** is any system where a human operator can read, export, or modify consumer financial data, Plaid access tokens, or the encryption key that protects them — directly, or by deploying code that does.

By that test, four systems are in scope:

| System | Why in scope | Human access method |
|---|---|---|
| **Vercel** | Holds production environment variables (`ENCRYPTION_KEY`, `DATABASE_URL`, Plaid secrets); deploys code that reads consumer data | Team login |
| **GitHub** | Source of deployed code; a merge to `main` reaches production | Web + SSH |
| **Neon PostgreSQL** | Stores all consumer financial data | Console login (application access is by connection string, not human login) |
| **Plaid Dashboard** | Item management, keys, and consumer-linked institutions | Web login |

Google OAuth is a consumer identity provider, not an internal system, and is out of scope for this policy.

## 3. Requirement

MFA is **required** on every account that can authenticate to a system in §2. There are no exempt accounts and no break-glass account without MFA.

Where the provider supports it, MFA is enforced at the **organization or team level** rather than left to per-user choice, so that a new or re-enrolled account cannot exist without it.

## 4. Access Inventory and Enforcement State

The table below records enforcement state. It is deliberately split into what is claimed and what has been evidenced, because those are different facts.

| System | Required MFA | Enforced org-wide? | Evidence on file |
|---|---|---|---|
| Vercel | Yes | _unconfirmed_ | _none — see §9.1_ |
| GitHub | Yes | _unconfirmed_ | _none — see §9.1_ |
| Neon | Yes | _unconfirmed_ | _none — see §9.1_ |
| Plaid Dashboard | Yes | _unconfirmed_ | _none — see §9.1_ |

`policies/access-control-policy.md` §9 already states that all four are behind MFA. That statement has not been re-verified against the providers' current settings, and no evidence of enforcement is retained. This policy does not restate the claim until §9.1 is closed.

**Two limits on what MFA covers here, both of which are current:**

- `main` on the source repository has **no branch protection** (verified 2026-08-20: `GET /repos/{owner}/{repo}/branches/main/protection` returns `404 Branch not protected`). MFA governs *who* can authenticate to GitHub; it does not require that a change to deployed code passes review. `policies/information-security-policy.md` §8 states that all changes go through pull request review — that is current practice, but it is not enforced by a control.
- The application's database credential is a connection string held as an environment variable. It is not a human login and MFA does not apply to it. Its protection is secret handling, not MFA.

## 5. Account Lifecycle

This section states requirements this policy establishes — not observed practice. None of the three can be verified from the repository; as-practiced verification is the §7 review, whose first pass is pending (§9.1).

- MFA **must** be enrolled at account creation, before the account is granted access to any system in §2.
- Recovery codes issued by a provider **must** be stored in the owner's password manager — never in the repository, a shared document, or a ticket.
- When an account is removed from a system, its removal **must** be recorded in the access review record described in `policies/access-control-policy.md` §8.

## 6. Consumer MFA (In-Product, Distinct from §2)

The application implements TOTP MFA for consumer accounts. This is a separate control from internal-system MFA and is recorded here so the two are not conflated in review.

| Property | Implementation | Location |
|---|---|---|
| TOTP verification | RFC 6238, `window: 1` | `src/lib/mfa.ts` |
| Secret storage | AES-256-GCM encrypted at rest | `src/db/schema.ts` — `mfa_credentials.totp_secret` |
| Replay prevention | Consumed timestep recorded; a code at or below the last consumed step is rejected | `src/lib/mfa.ts` — `nextTotpStep()` |
| Recovery codes | bcrypt hashes, one per code; compared against every stored hash without early exit | `src/lib/mfa.ts` — `verifyRecoveryCode()` |
| Rate limiting | Per-user limit on verification attempts | `src/app/api/mfa/verify/route.ts` |
| Audit events | `auth.mfa_enrolled`, `auth.mfa_verified`, `auth.mfa_disabled`, `auth.mfa_failed`, `auth.mfa_rate_limited` | `src/db/schema.ts` |
| Tests | 4 suites covering the library and all three routes | `src/__tests__/mfa*.test.ts` |

Consumer MFA is **available to all consumer accounts and not required of them**. This policy does not claim otherwise.

## 7. Verification and Evidence

Enforcement is re-verified **quarterly**, alongside the access review in `policies/access-control-policy.md` §8. Each verification captures, for each system in §2: the account list, whether MFA is on for each account, and whether the org-level enforcement setting is on.

Evidence is retained for the current and prior review.

## 8. Control Status (measured 2026-08-20)
Status values below: **Implemented** — verified present. **Partial** — present but narrower than the policy statement. **Not implemented** — verified absent. **Unverified** — cannot be measured from the repository and has not been confirmed elsewhere; it is not a synonym for absent, and it is not a synonym for fine.

| Control | Status | Basis |
|---|---|---|
| Consumer TOTP MFA implemented | **Implemented** | Code and tests cited in §6 |
| Internal MFA required by policy | **Implemented** (this document) | §3 |
| Internal MFA enforced at provider | **Unverified** | Cannot be measured from the repository; provider settings are not accessible to this review |
| Enforcement evidence retained | **Not implemented** | No evidence on file |
| Quarterly verification performed | **Not implemented** | No prior verification recorded |
| Branch protection on `main` | **Not implemented** | GitHub API, 2026-08-20 |

## 9. Open Decisions Required Before Submission

**9.1 — Confirm and evidence MFA on each of the four systems in §2.** Only the account owner can read these settings. For each: is MFA on, is it enforced at org/team level, and what evidence will be retained? This cannot be answered from the repository and is the single blocker on this attestation. (Measured 2026-08-21: the GitHub setting is not even readable with the repository credential this audit uses — `GET /user` returns `two_factor_authentication: null` without the `user` OAuth scope. Null means unreadable, not absent.)

**9.2 — Confirm the account inventory is complete.** §2 lists four systems. If any other account can reach consumer data — a monitoring tool, a backup service, a personal script with a production connection string, a second GitHub account — it belongs in §2.

**9.3 — Decide whether `main` gets branch protection.** If yes, this policy and ISP §8 describe an enforced control. If no, ISP §8's review statement should be reworded to describe practice rather than enforcement.

**9.4 — Set the effective date and version.** The four accepted policies are Version 1.0, effective 2026-04-14.

## 10. Policy Review

This policy is reviewed annually, or upon any change to the systems in §2 or to their access methods.
