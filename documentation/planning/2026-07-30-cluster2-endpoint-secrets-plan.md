# Cluster 2 — Endpoint & Secrets Hardening Implementation Plan

> Executed via `/claudna:implement-plan`. Downstream of the batched-cluster issue-cleanup
> roadmap (see `2026-07-24-cluster1-auth-authz-plan.md` for the Cluster 1 precedent and
> the A/B split pattern this plan reuses).

**Goal:** Close the endpoint- and secrets-surface security issues surfaced by the audit:
cron fail-open, unguarded `/api/*` surface, missing auth rate-limiting, unguarded admin
deprovision, and plaintext OAuth tokens at rest.

**Architecture:** Two ship-ready PRs, split by migration-dependency (mirrors Cluster 1):
- **Part A (this plan, one PR — code-only, no migration):** #128, #111, #109, #139.
- **Part B (separate PR — data migration):** #126 (encrypt OAuth tokens + backfill).

**Tech Stack:** Next.js 16 (App Router), NextAuth v5 (beta.30), Drizzle ORM + Neon
Postgres (`neon-http`, Edge-safe), Vitest.

## Global Constraints

- **CI runs `npm test` only** (not lint/typecheck) — repo lint is red (tracked by #137).
  A test-only gate keeps this PR green. Run `npx tsc --noEmit` on the changed surface
  locally before the PR (CI won't catch type errors).
- **Every route/lib test MUST `vi.mock("@/db", …)`** or the import chain calls `neon()` at
  module load and fails with "no DATABASE_URL". Copy the chained-builder mock from
  `middleware-gate.test.ts` / `mfa-verify-route.test.ts`.
- `vi.fn()` mocks whose `.mock.calls[0][0]` is indexed MUST declare a typed param, else
  `tsc` errors TS2493/TS2352.
- Branch: `implement/cluster2-endpoint-hardening`. One squash commit per PR.

---

## Locked decisions (challenge round)

1. **Scope/split:** Part A = #128 + #111 + #109 + #139 (one PR). Part B = #126 (deferred).
2. **#109 rate-limit lives at BOTH layers:** email-keyed at the sign-in route + IP-keyed in
   middleware. Limit **10 / 15 min** for auth; successful sign-in does **not** reset the
   counter (anti-enumeration).
3. **#139 owner→owner policy:** allow owner→owner deprovision, but block self-target and
   the last remaining owner.

---

## Task 1: #128 — cron auth fails closed on unset secret

**Files:** Modify `src/lib/api-helpers.ts` · Test `src/__tests__/api-helpers-cron.test.ts`

`requireCronAuth` builds `` `Bearer ${process.env.CRON_SECRET}` `` unguarded — an unset
secret makes `expected === "Bearer undefined"`, which `Authorization: Bearer undefined`
matches. Guard fail-closed before the compare, mirroring `telegram/webhook/route.ts:25-28`
(returns 500 "Server misconfiguration" on a missing secret).

- [ ] Test: unset `CRON_SECRET` + header `Bearer undefined` → 500 (not null/authorized).
- [ ] Test: set `CRON_SECRET` + correct header → null (authorized); wrong header → 401.
- [ ] Implement: `if (!process.env.CRON_SECRET) return NextResponse.json({error:"Server misconfiguration"},{status:500})` before building `expected`.

## Task 2: #139 — deprovision self-target + last-owner guards

**Files:** Modify `src/lib/rbac.ts`, `src/app/api/admin/users/route.ts` ·
Test `src/__tests__/admin-users-deprovision.test.ts`

The `deprovision` branch is gated only by `hasMinRole(callerRole,"owner")` — no self-target
or last-owner check (the #127 guards were scoped to the role-change branch only).

- [ ] Add `countCurrentOwners(): Promise<number>` to `rbac.ts` (count `users` where
      `role="owner" AND isCurrent=true`).
- [ ] Test: self-deprovision → 403; last-owner deprovision → 403; owner→owner (another
      owner remains) → 200; owner→lower-rank → 200.
- [ ] Implement in the deprovision branch, after the owner gate:
      self-target → 403; if target's current role is `owner` and `countCurrentOwners()===1`
      → 403.

## Task 3: #111 — middleware default-gate for `/api/*`

**Files:** Modify `src/middleware.ts`, `src/lib/middleware-gate.ts` ·
Test `src/__tests__/middleware-gate.test.ts`

Matcher covers only `/dashboard`, `/profile`, `/auth`, `/api/admin`. Invert to
default-protect all `/api/*` with a precise public allowlist.

- [ ] Matcher: add `/api/:path*`.
- [ ] `evaluateGate` (stays a pure function): public allowlist returns `next` —
      `/api/auth/*`, `/api/cron/*`, `/api/telegram/webhook` (**tightened** from the current
      `/api/telegram` prefix — `config`/`link-token`/`test` are user routes), and
      `/api/profile/confirm-email`, `/api/profile/revoke-email-change`.
- [ ] All other `/api/*`: 401 `Unauthorized` when unauth'd; 401 `MFA required` when
      MFA-enabled-but-unverified (same treatment `/api/admin` already gets).
- [ ] Tests: allowlisted routes stay open; a sample gated route (e.g. `/api/transactions`)
      → 401 unauth'd, 401 MFA-required, `next` when authed+verified; `/api/telegram/config`
      now gated, `/api/telegram/webhook` still open.

## Task 4: #109 — auth sign-in rate-limit (email + IP)

**Files:** Modify `src/lib/rate-limit.ts`, `src/app/api/auth/[...nextauth]/route.ts`,
`src/middleware.ts` · Test `src/__tests__/auth-rate-limit-route.test.ts`,
extend `middleware-gate` / a middleware IP test

- [ ] Parameterize `checkRateLimit(key, maxAttempts=MAX_ATTEMPTS)` and
      `recordFailure(key, maxAttempts=MAX_ATTEMPTS)` — default keeps existing callers at 5.
      Add `AUTH_MAX_ATTEMPTS = 10`.
- [ ] **Route (email):** wrap the exported `POST`. Clone the request, read `email` from the
      form body; if present, key `auth:email:<lowercased-email>`, `checkRateLimit` →
      429 + `Retry-After` when blocked, else `recordFailure` and delegate to NextAuth's POST.
      No email (OAuth) → skip (IP layer covers it). Do NOT reset on success.
- [ ] **Middleware (IP):** for `/api/auth/signin*` and `/api/auth/callback*` ONLY (never
      `session`/`csrf`/`providers`), key `auth:ip:<x-forwarded-for first hop>`,
      `checkRateLimit` → 429 when blocked. Uses the Edge-safe `neon-http` client.
- [ ] Tests: 11th email attempt in window → 429; independent per-email; middleware blocks by
      IP on signin path but not on `/api/auth/session`.

---

## Verification checklist

- [x] `npm test` — full suite green (**248 passing**, +40 from baseline 208).
- [x] `npx tsc --noEmit` — clean on the changed surface (only pre-existing
      `profile-email-change.test.ts` mock-type errors remain, tracked by #137).
- [x] `/simplify` pass — 4 angles; applied 3 findings (see log), skipped the rest.
- [x] Manual reasoning: allowlist covers every currently-public `/api/*` route (checked
      against the route tree); no NextAuth internal route (`session`/`csrf`) rate-limited.

## Execution log

Status: **COMPLETE** — branch `implement/cluster2-endpoint-hardening`, one commit per task.

- **#128** — fail-closed `if (!CRON_SECRET) return 500` before compare; +5 tests.
- **#139** — `countCurrentOwners()` + last-owner guard; +5 tests.
- **#111** — `/api/:path*` matcher + allowlist gate; telegram exemption tightened to
  `/api/telegram/webhook` only; +8 gate tests.
- **#109** — parameterized `maxAttempts` (default 5, auth 10); new `src/lib/auth-rate-limit.ts`
  (shared enforce/keys/response); email-keyed at the route, IP-keyed in middleware; +20 tests.

**Simplify pass — applied:** (1) hoisted the self-target guard to one handler-wide gate above
the deprovision/role branch split (a future admin action inherits it); (2) dropped a redundant
`isProtectedApi` alias in `evaluateGate`; (3) added `ipRateLimitKey()` so the `auth:*` key
namespace lives in one place. **Skipped (noted):**
- Extracting a shared 429/`Retry-After` helper and a shared client-IP helper and migrating the
  existing inline copies (mfa/profile/consent/audit routes) — out of this PR's scope; **tech-debt
  follow-up**.
- Unifying the cron/telegram secret-verification into one `requireSecretHeader` helper — touches
  the un-edited telegram route; **tech-debt follow-up**.
- Narrowing the middleware matcher with a negative-lookahead to skip session-decode on the
  high-frequency `/api/auth/{session,csrf,providers}` polling routes — a real perf win, but it
  complicates the security chokepoint and the regex can't be unit-tested here; **perf follow-up**.
- `countCurrentOwners` SQL `count(*)` vs `.length` — negligible (owners are few).

## Deferred — Part B (separate PR)

- **#126** — encrypt `auth_accounts` OAuth tokens (`refresh_token`/`access_token`/`id_token`)
  via `encrypt()` in `linkAccount`, + one-time backfill of existing rows. **No decrypt-on-read
  path** (grep confirms those columns are never read in app code) and **no schema change**
  (columns already `text`/nullable). Migration-bearing → its own runbook, like Part B of
  Cluster 1.
