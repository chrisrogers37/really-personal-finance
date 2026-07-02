# System Review & Tech-Debt Triage

_Full-system review performed 2026-07-02 against `main` @ `63e4601`._

This document is a **triage tracker**. It captures a fresh, end-to-end review of the
codebase (architecture, security, correctness, quality gates, and enhancements) and
records each finding with severity, evidence, and a recommendation.

The repository already has an extensive issue backlog (many labelled `auto-audit`).
To avoid duplication, this tracker separates:

- **Part 1 — New findings** not currently represented in the issue tracker. These are the
  primary output of this review and are the best candidates to file as new GitHub issues.
- **Part 2 — Already-tracked findings** confirmed still-present, cross-referenced to their
  open issue numbers so the whole backlog can be viewed in one place.

## Health snapshot

| Signal | Result | Notes |
|--------|--------|-------|
| Unit tests (`npm test`) | ✅ 176 passing | 15 files, ~1.5s |
| Lint (`npm run lint`) | ❌ **9 errors, 14 warnings** | See NEW-3 |
| Typecheck (`tsc --noEmit`) | ❌ 3 errors (test file) | See NEW-11; no `typecheck` script |
| Production build (`next build`) | ❌ fails collecting page data | See NEW-2 (needs live env at build) |
| `npm audit` | ⚠️ 20 vulns (1 critical, 7 high, 11 moderate, 1 low) | Mostly dev-chain; see NEW-6 |
| CI pipeline | ❌ none | `.github/workflows` absent; see NEW-4 |

Severity scale: **P0** critical / actively harmful · **P1** high · **P2** medium · **P3** low.

---

## Part 1 — New findings (not in the issue tracker)

| # | Severity | Area | Finding |
|---|----------|------|---------|
| NEW-1 | **P0** | Security / Data | Profile update silently drops `role` **and** `mfaEnabled` |
| NEW-2 | P2 | Build / Arch | `next build` requires live runtime env (eager module-load side effects) |
| NEW-3 | P2 | Quality | `npm run lint` fails with 9 errors |
| NEW-4 | **P1** | Process | No CI pipeline — nothing runs tests/lint/types/audit |
| NEW-5 | P2 | Plaid / Compliance | Plaid Item never removed on account/data deletion |
| NEW-6 | P2 | Dependencies | Outstanding dependency vulnerabilities (incl. 1 critical dev) |
| NEW-7 | P2 | Performance / Arch | DB session strategy over neon-http → many auth round-trips/request |
| NEW-8 | P2 | Arch / Data | SCD2 invariant violated by in-place mutations (`role`, `mfaEnabled`) |
| NEW-9 | P3 | Tech debt | `middleware.ts` uses the deprecated convention (Next 16 → `proxy`) |
| NEW-10 | P3 | Abuse / Cost | `POST /api/sync/trigger` has no rate limiting |
| NEW-11 | P3 | Quality | No `typecheck` script; build does not catch test-file type errors |
| NEW-12 | P3 | UX / Correctness | Dashboard "This Month" cards show latest month _with data_, not current month |
| NEW-13 | P3 | Compliance | `exchange-token` does not verify active Plaid consent before linking |
| NEW-14 | P3 | Data | `grantConsent` revoke-then-insert is not atomic |

### NEW-1 — Profile update silently drops `role` and `mfaEnabled` (P0)

`updateUserProfile()` closes the current SCD2 row and inserts a new "current" row, but the
insert only carries `email`, `name`, and `emailVerified`. It never copies `role` or
`mfaEnabled`, so the new row falls back to the schema defaults (`role = "member"`,
`mfaEnabled = false`).

```47:64:src/lib/scd2.ts
  const [newVersion] = await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ validTo: now, isCurrent: false })
      .where(eq(users.id, current.id));

    return tx
      .insert(users)
      .values({
        userId: current.userId,
        email: updates.email ?? current.email,
        name: updates.name ?? current.name,
        emailVerified: resolvedEmailVerified,
        validFrom: now,
        isCurrent: true,
      })
      .returning();
  });
```

`role`/`mfaEnabled` defaults from the schema:

```55:57:src/db/schema.ts
    role: userRoleEnum("role").notNull().default("member"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
```

**Impact — two distinct high-severity effects:**

1. **Privilege regression.** Any `owner`/`admin`/`viewer` who edits their name or email is
   silently demoted to `member` on the new current row. An owner can lock themselves out of
   admin capabilities by changing their display name.
2. **Silent MFA bypass.** A user with MFA enabled who edits their profile gets
   `users.mfaEnabled = false` on the new current row, while their verified `mfaCredentials`
   row still exists. The middleware gate keys MFA enforcement off `users.mfaEnabled`
   (`mfaEnabled && !mfaVerifiedAt`), so MFA stops being enforced after a profile edit even
   though the account "has" MFA. This is a security downgrade.

**Trigger paths:** `PUT /api/profile` (name change, and the `if (name)` branch during an
email change), `GET /api/profile/confirm-email` (email confirmation), and the NextAuth
adapter `updateUser` (fires on OAuth sign-in when name/`emailVerified` changes) — all call
`updateUserProfile`.

**Recommendation:** carry forward all versioned columns when inserting a new SCD2 row
(`role: current.role`, `mfaEnabled: current.mfaEnabled`, and any future user columns).
Add a regression test asserting role + MFA persist across a profile update. Consider a
helper that spreads the current row and overrides only changed fields so new columns can't
be forgotten again.

### NEW-2 — `next build` requires live runtime env (P2)

The DB client and the Email auth provider are constructed at **module-evaluation time**, so
importing any route that (transitively) imports them executes those side effects. Next's
"Collecting page data" step evaluates route modules, so the build crashes unless real
runtime secrets are present.

```5:7:src/db/index.ts
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
```

```14:18:src/lib/auth.ts
    Email({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
```

Observed build failures:

- Without `DATABASE_URL`: `Error: No database connection string was provided to 'neon()'` →
  `Failed to collect page data for /api/accounts/[id]`.
- With `DATABASE_URL` but no `EMAIL_SERVER`: `Nodemailer requires a 'server' configuration`
  (AuthError) at the same step.

**Impact:** builds are non-hermetic and coupled to runtime secrets; CI/preview builds and
any static prerender are fragile. It also masks the fact that ESLint is **not** run during
`next build` here (see NEW-3/NEW-4).

**Recommendation:** initialize `neon()`/`drizzle` lazily (module-level `Proxy` or a
`getDb()` accessor) so import is side-effect free. Ensure auth provider construction tolerates
missing env at build time. Then wire a build step into CI (NEW-4).

### NEW-3 — `npm run lint` fails with 9 errors (P2)

`npm run lint` currently exits non-zero:

- **8×** `react-hooks/set-state-in-effect` — every dashboard/profile data page plus
  `sync-status-banner.tsx` calls a `fetch…()` that `setState`s synchronously inside a
  `useEffect`. Files: `dashboard/page.tsx:33`, `dashboard/categories/page.tsx:37`,
  `dashboard/merchants/page.tsx:37`, `dashboard/transactions/page.tsx:58`,
  `dashboard/settings/page.tsx:84`, `dashboard/layout.tsx:44`, `profile/page.tsx:16`,
  `components/sync-status-banner.tsx:34`.
- **1×** `@typescript-eslint/no-explicit-any` — `dashboard/import/page.tsx:35`.
- Plus 14 unused-variable warnings.

**Impact:** the lint gate is red. Because there is no CI (NEW-4) and `next build` does not
run ESLint in this setup, this went unnoticed. Overlaps in root cause with the repeated
fetch/loading/error boilerplate in **#120**.

**Recommendation:** extract a shared `useApiData(url)` hook (fixes the boilerplate from
#120 and resolves all 8 `set-state-in-effect` errors), type the `any` in the import page,
and clean the unused imports.

### NEW-4 — No CI pipeline (P1, process)

There is no `.github/workflows/` directory. Despite having `test`, `lint`, `test:coverage`,
and `build` scripts, nothing runs them automatically on push/PR. For a finance app handling
bank data (with a long history of security fixes), the absence of automated quality/security
gates is a significant process risk — and directly explains why lint (NEW-3) and typecheck
(NEW-11) are currently red on `main`.

**Recommendation:** add a CI workflow that runs `npm ci`, `npm run lint`, `tsc --noEmit`,
`npm test`, `npm run build` (once NEW-2 is fixed), and `npm audit --audit-level=high`.
Ties into existing Plaid attestation issues **#38** (vuln scanning) and **#32** (patching SLA).

### NEW-5 — Plaid Item never removed on account/data deletion (P2)

Deleting an account (`DELETE /api/accounts/[id]`) and full account deletion
(`POST /api/data/delete`) delete local rows and the encrypted access token, but never call
Plaid `/item/remove`. `itemRemove` appears nowhere in the codebase.

```64:72:src/app/api/accounts/[id]/route.ts
  // Atomic delete: transactions first, then account
  await db.transaction(async (tx) => {
    await tx
      .delete(transactions)
      .where(eq(transactions.accountId, id));
    await tx
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  });
```

**Impact:** the Plaid Item stays active on Plaid's side after the user deletes it locally —
ongoing data access, potential per-item billing, and a data-retention/compliance gap (the
item and its consent are not actually revoked upstream). Relates to Plaid data-minimization
attestations.

**Recommendation:** before deleting the last local account for a `plaidItemId`, decrypt the
token and call `plaidClient.itemRemove({ access_token })`; tolerate/logs failures so local
deletion still proceeds. Apply to both the single-account delete and full data deletion.

### NEW-6 — Outstanding dependency vulnerabilities (P2)

`npm audit` reports 20 vulnerabilities (1 critical, 7 high, 11 moderate, 1 low):

- **Dev-chain (easy fix via `npm audit fix`):** `vitest` (**critical** — UI server arbitrary
  file read/exec), `vite`, `rollup`, `picomatch` (high). Non-shipping but should not sit red.
- **Runtime chain (partly tracked):** `next-auth@5-beta` → `@auth/core` → vulnerable
  `nodemailer`; `next` → vulnerable `postcss`. Overlaps **#80** (nodemailer watch) and
  **#103** (next-auth pinned to beta).

**Recommendation:** run `npm audit fix` for the dev-chain now; track the runtime-chain items
under #80/#103 and gate future regressions with `npm audit` in CI (NEW-4).

### NEW-7 — Database sessions over neon-http cause many auth round-trips (P2)

The app uses `session.strategy: "database"` with the Neon **HTTP** driver (each query is a
separate HTTP round-trip). Auth resolution is expensive and duplicated:

- `middleware.ts` builds its own `NextAuth(authConfig)` and calls `auth()` on every matched
  request → adapter `getSessionAndUser` (session + user queries) **plus** the `session`
  callback, which issues an extra `users` query for role/MFA.
- The matched route handler then calls `auth()` again via `requireUser()`, repeating the
  same lookups.

```264:277:src/lib/auth.config.ts
    async session({ session, user }) {
      session.user.id = user.id;

      // Attach role and MFA status to session
      const [currentUser] = await db
        .select({ role: users.role, mfaEnabled: users.mfaEnabled })
        .from(users)
        .where(and(eq(users.userId, user.id), eq(users.isCurrent, true)))
        .limit(1);
```

**Impact:** roughly half a dozen serial DB HTTP round-trips per protected request just for
auth, adding latency on every dashboard/API call.

**Recommendation:** fold role/`mfaEnabled` into the `getSessionAndUser` user query instead of
a second `session`-callback query; consider caching within a request; evaluate whether the
middleware needs a full DB session resolution or can do a lighter cookie/JWT check.

### NEW-8 — SCD2 invariant violated by in-place mutations (P2)

The `users` table is SCD2 ("profile updates create new versioned rows … full audit trail" —
README), but several writes mutate the **current** row in place instead of versioning:

```30:38:src/lib/rbac.ts
export async function setUserRole(
  targetUserId: string,
  newRole: UserRole,
): Promise<void> {
  await db
    .update(users)
    .set({ role: newRole })
    .where(and(eq(users.userId, targetUserId), eq(users.isCurrent, true)));
}
```

`confirmMfaEnrollment` and `disableMfa` (`src/lib/mfa.ts`) likewise `update(users).set({ mfaEnabled })`
in place. Combined with NEW-1, the model is internally inconsistent: some changes are
versioned (name/email) and some are in-place (role/MFA), and versioned updates then wipe the
in-place columns.

**Impact:** role changes and MFA toggles are absent from the SCD2 history (weakening the
documented audit trail), and the two update styles interact to produce NEW-1.

**Recommendation:** decide the ownership model deliberately — either version _all_ mutable
user attributes through a single SCD2 update path (preferred, and fixes NEW-1), or move
volatile flags (`role`, `mfaEnabled`) out of the SCD2 table into a non-versioned
`user_state` table keyed by `userId`.

### NEW-9 — Deprecated `middleware` convention (P3)

`next build` warns: _"The 'middleware' file convention is deprecated. Please use 'proxy'
instead."_ (Next.js 16). `src/middleware.ts` should migrate to the `proxy` convention before
it is removed in a future major.

### NEW-10 — `POST /api/sync/trigger` has no rate limiting (P3)

The user-triggered sync endpoint calls Plaid `transactionsSync` with no throttling, so a
user can repeatedly trigger syncs (Plaid cost / abuse). Reuse the existing
`checkRateLimit`/`recordFailure` helpers keyed by `sync:{userId}`.

### NEW-11 — No `typecheck` script; build misses test-file type errors (P3)

`tsc --noEmit` reports 3 errors in `src/__tests__/profile-email-change.test.ts` (mock shape
mismatches), but `next build` reports "Finished TypeScript" successfully — it does not
type-check the test files. There is no `typecheck` npm script, so these never surface.
Add `"typecheck": "tsc --noEmit"` and run it in CI (NEW-4); fix the test mock types.

### NEW-12 — Dashboard "This Month" cards use the latest month with data (P3)

`dashboard/page.tsx` derives the summary cards from `data[data.length - 1]` (the most recent
month that _has_ transactions) and labels them "This Month". If the current calendar month
has no transactions yet, last month's numbers are shown under a "This Month" label.

```39:39:src/app/dashboard/page.tsx
  const latestMonth = data.length > 0 ? data[data.length - 1] : null;
```

**Recommendation:** match on the current `YYYY-MM` (show `$0.00` when the month has no data)
or relabel the card to reflect the actual period.

### NEW-13 — `exchange-token` does not verify active Plaid consent (P3)

`POST /api/plaid/exchange-token` links accounts and stores tokens without checking
`hasActiveConsent(userId, "plaid_data_access")`, even though a full consent subsystem exists
(`src/lib/consent.ts`). Consent is presumably enforced only client-side. Enforce it
server-side at link time to keep the consent record authoritative.

### NEW-14 — `grantConsent` revoke-then-insert is not atomic (P3)

`grantConsent` performs a revoke `UPDATE` followed by a separate `INSERT` with no transaction,
so a concurrent read/crash between the two can momentarily observe zero or two active consents
of a type. Wrap both statements in a transaction. (`src/lib/consent.ts:8-32`.)

---

## Part 2 — Already-tracked findings (confirmed present)

Confirmed still-present during this review; cross-referenced to their open issues so this
tracker is a single triage view. No new action needed beyond the linked issues.

### Security (open)
- **#111** middleware matcher does not cover `/api/*` by default (protected routes rely on
  per-handler `requireUser`; `evaluateGate` explicitly `next()`s `/api/cron` + `/api/telegram`).
- **#109** no rate limiting on auth/login endpoints.
- **#108** stored-XSS risk in `confirm-email` HTML (`newEmail`/`message` interpolated into
  `NextResponse` HTML without escaping — `src/app/api/profile/confirm-email/route.ts`).
- **#102** merchant filter passes unescaped `%`/`_` into `ilike` (`transactions/route.ts:45`).
- **#79** merchant names not HTML-escaped in Telegram messages (`src/lib/alerts.ts`).
- **#78** MFA recovery codes stored/compared as plaintext via `indexOf` (not hashed /
  constant-time) — `src/lib/mfa.ts:89-91`.
- **#80** AES-GCM IV sizing + nodemailer advisory watch (note: `encryption.ts` uses a 16-byte
  IV, functionally fine for GCM).

### Data / correctness (open)
- **#95** SCD2 profile update TOCTOU (current row read outside the transaction — `scd2.ts:20`).
- **#96** no foreign-key constraints in the schema (all relations are app-enforced only).
- **#97** data deletion skips user-associated tables (`emailChangeTokens`,
  `telegramLinkTokens`; `auditLogs` intentionally retained) — `data/delete/route.ts`.
- **#98** sync cron fetches **all** accounts including non-Plaid (`cron/sync-transactions`
  does `db.select().from(accounts)` with no `source = 'plaid'` filter; contrast with the
  user-triggered `sync/trigger` which filters correctly).
- **#99** import confirm reports attempted count, not rows actually inserted
  (`inserted += values.length` ignores `onConflictDoNothing` — `import/confirm/route.ts:56`).
- **#100** anomaly detection uses a hardcoded `/4` weekly divisor (`alerts.ts:146`).
- **#101** daily summary uses UTC day boundary rather than the user's timezone (`alerts.ts:9`).
- **#104** `PlaidAccount` uses a loose `[key: string]: unknown` index signature
  (`sync-plaid.ts:14`).

### Tech debt / structure (open)
- **#103** `next-auth` pinned to a beta pre-release (`5.0.0-beta.30`).
- **#70** env vars read at first use, not validated at startup (compounds NEW-2).
- **#83** missing unit tests for `audit`, `consent`, `mfa`, `rate-limit`, `rbac`, `sync-plaid`.
- **#87** extract `<MobileNavDrawer/>` from `dashboard/layout.tsx` (344 lines).
- **#86** extract import-wizard state hook from `dashboard/import/page.tsx` (478 lines).
- **#85** split `dashboard/settings/page.tsx` (489 lines).
- **#84** split `column-mapper.tsx` (503 lines).
- **#121** profile success/error styling inferred from `message.includes("success")`.
- **#120** fetch/loading/error boilerplate repeated across dashboard pages (same root cause
  as NEW-3's lint errors).
- **#119** transactions page forks the shared `DateRangeFilter`.
- **#118** `CHART_THEME`/palette duplicated across 3 chart components.
- **#117** CSV per-row parse skeleton duplicated across 4 parser loops.
- **#116** hand-rolled string-field validation repeated ~9×.
- **#115** Plaid txn→row mapping duplicated across insert/update branches (`sync-plaid.ts`).
- **#114** `AuditAction` union duplicates `auditActionEnum` verbatim (derive from the enum).
- **#113** Telegram webhook dispatch is a long `if`-chain with inlined strings.
- **#112** duplicated `startDate`/`endDate` parse+validate across 4 analytics/transaction routes.

### Plaid compliance (open)
- **#38** vulnerability scanning · **#32** patching within SLA · **#31** EOL software
  monitoring · **#29** MFA on internal systems. (CI from NEW-4 supports #38/#32.)

---

## Recommended order of attack

1. **NEW-1** (P0) — fix SCD2 role/MFA data loss; add regression test. _Security + privilege._
2. **NEW-4** (P1) — stand up CI (lint + typecheck + test + audit). Makes everything else visible.
3. **NEW-3 / #120** — shared `useApiData` hook; clears 8 lint errors and the fetch boilerplate.
4. **NEW-2** — lazy DB/auth init so builds are hermetic; enables `build` in CI.
5. **NEW-6** — `npm audit fix` for the dev-chain critical/highs.
6. **NEW-5** — call Plaid `itemRemove` on deletion (compliance + cost).
7. **NEW-8 / #95** — settle the SCD2 ownership model for volatile flags.
8. Remaining P2/P3 items and the tracked backlog above.
