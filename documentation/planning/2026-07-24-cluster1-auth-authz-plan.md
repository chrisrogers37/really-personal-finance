# Cluster 1 — Auth & Authorization Hardening Implementation Plan

> **For agentic workers:** Implement this plan task-by-task using `/claudna:implement-plan` (the executor the user selected). Steps use checkbox (`- [ ]`) syntax for tracking — check each off as it lands. Each task ends with a green `npm test` and a commit.

**Goal:** Close the six open Auth & Authorization security issues (#125, #135, #127, #78, #130, #131) on really-personal-finance, each landing with a regression test, so no single auth bug can undermine the app's protection of bank + PII data.

**Architecture:** Pure code fixes to the auth/MFA/RBAC layer (`src/lib/mfa.ts`, `src/lib/scd2.ts`, `src/lib/rbac.ts`, the MFA-enroll and admin-users routes, the MFA challenge page) plus one shared callback-URL sanitizer. Two of the fixes (#78, #130) additionally alter the `mfa_credentials` schema and need a data backfill; they are isolated into **Part B** so the four pure-code fixes (**Part A**) can ship first. Tests follow the repo's existing `vi.mock("@/db", …)` convention (see `src/__tests__/scd2-email-verified.test.ts`, `src/__tests__/mfa-verify-route.test.ts`).

**Tech Stack:** Next.js 14 (App Router, TypeScript), Drizzle ORM + Neon Postgres, NextAuth v5, `otpauth` (TOTP), Vitest 3. New dep in Part B: `bcryptjs`.

## Global Constraints

- **Test runner:** `npm test` (`vitest run`). Test files live in `src/__tests__/*.test.ts`, `environment: node`, `globals: true`. Path alias `@/` → `src/`.
- **DB in tests is always mocked** via `vi.mock("@/db", …)` — never hit a real database in unit tests. Mock chained builders (`select().from().where().limit()`, `update().set().where()`, `insert().values().returning()`, `transaction(cb)`) exactly as the existing tests do.
- **CI runs `npm test` only** (not `npm run lint` / typecheck) — repo lint is currently red (tracked separately by #137); a test-only gate keeps this cluster's PR green. Lint/typecheck gating is deferred to Cluster 8 / #137.
- **Encryption:** secrets in `mfa_credentials` are AES-256-GCM encrypted via `encrypt`/`decrypt` from `src/lib/encryption.ts`. Do not log decrypted material.
- **Commit style:** Conventional Commits, one commit per task, each commit message references its issue number.
- **Never reset `verified` / overwrite a TOTP secret without proof of possession of the current factor** (governs #125).

## Branch & PR strategy

- Branch off up-to-date `main`: `implement/auth-authz-cluster1`.
- One commit per task. Open **one PR** for the cluster: _"Cluster 1: Auth & Authorization hardening"_.
- Part A closes #135, #127, #131, #125. Part B closes #78, #130. If Part B slips, the PR can merge with Part A and Part B moves to a follow-up PR on the same branch lineage.

---

## PART A — Pure-code fixes (ship-ready, no migration)

### Task 1: CI safety net (test-only) — advances #136

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the workflow**

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
```

- [ ] **Step 2: Verify the test suite passes locally (the gate CI will enforce)**

Run: `npm test`
Expected: PASS (all existing suites green).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run vitest on PRs and main pushes (advances #136)"
```

> Note: `lint`/typecheck are intentionally excluded until #137 clears the red lint. Do not add them here.

---

### Task 2: #135 — SCD2 profile update must carry forward `role` and `mfaEnabled`

**Severity:** P0 (privilege regression + silent MFA-enforcement bypass).

**Files:**
- Modify: `src/lib/scd2.ts:47-64` (the `db.transaction` insert)
- Test: `src/__tests__/scd2-carry-forward.test.ts` (new)

**Root cause:** the SCD2 insert lists only `email`, `name`, `emailVerified`, `validFrom`, `isCurrent`, so `role` and `mfaEnabled` fall back to schema defaults (`member` / `false`) on every profile edit.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const selectLimit = vi.fn();
const selectWhere = vi.fn(() => ({ limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));

const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
const txUpdateSet = vi.fn(() => ({ where: txUpdateWhere }));
const txInsertReturning = vi.fn();
const txInsertValues = vi.fn(() => ({ returning: txInsertReturning }));
const txObj = {
  update: vi.fn(() => ({ set: txUpdateSet })),
  insert: vi.fn(() => ({ values: txInsertValues })),
};

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({ from: selectFrom })),
    transaction: vi.fn(async (cb: (tx: typeof txObj) => Promise<unknown>) => cb(txObj)),
  },
}));

import { updateUserProfile } from "@/lib/scd2";

const CURRENT_ROW = {
  id: "row-1",
  userId: "user-1",
  email: "old@example.com",
  name: "Old Name",
  role: "owner",
  emailVerified: new Date("2026-01-01T00:00:00Z"),
  mfaEnabled: true,
  validFrom: new Date("2026-01-01"),
  validTo: null,
  isCurrent: true,
  createdAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  selectLimit.mockResolvedValue([CURRENT_ROW]);
  selectFrom.mockReturnValue({ where: selectWhere });
  selectWhere.mockReturnValue({ limit: selectLimit });
  txInsertReturning.mockResolvedValue([{ id: "row-2", userId: "user-1" }]);
});

describe("updateUserProfile — carries forward versioned columns (#135)", () => {
  it("preserves role and mfaEnabled on a name-only update", async () => {
    await updateUserProfile("user-1", { name: "New Name" });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ role: "owner", mfaEnabled: true, name: "New Name" }),
    );
  });

  it("preserves role and mfaEnabled across an email change", async () => {
    await updateUserProfile("user-1", { email: "new@example.com" });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ role: "owner", mfaEnabled: true, email: "new@example.com" }),
    );
  });

  it("does not carry the old primary key into the new row", async () => {
    await updateUserProfile("user-1", { name: "New Name" });
    const arg = txInsertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.id).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- scd2-carry-forward`
Expected: FAIL — insert arg is missing `role`/`mfaEnabled` (they default), assertion mismatch.

- [ ] **Step 3: Implement the fix**

In `src/lib/scd2.ts`, replace the insert `.values({...})` inside the transaction so it spreads the current row (dropping only lifecycle columns) and overrides just the changed fields:

```ts
  const [newVersion] = await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ validTo: now, isCurrent: false })
      .where(eq(users.id, current.id));

    // Carry forward every versioned column (role, mfaEnabled, and any future
    // user columns). Drop lifecycle columns so the new row gets fresh values.
    const { id: _id, createdAt: _createdAt, validFrom: _vf, validTo: _vt, isCurrent: _ic, ...carry } = current;

    return tx
      .insert(users)
      .values({
        ...carry,
        email: updates.email ?? current.email,
        name: updates.name ?? current.name,
        emailVerified: resolvedEmailVerified,
        validFrom: now,
        isCurrent: true,
      })
      .returning();
  });
```

- [ ] **Step 4: Run tests to verify pass (incl. the existing scd2 suite for no regression)**

Run: `npm test -- scd2`
Expected: PASS for both `scd2-carry-forward` and `scd2-email-verified`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scd2.ts src/__tests__/scd2-carry-forward.test.ts
git commit -m "fix(security): carry role + mfaEnabled forward on SCD2 profile update (closes #135)"
```

---

### Task 3: #127 — admin role-change must respect the target's current rank

**Severity:** MEDIUM (broken access control).

**Files:**
- Modify: `src/lib/rbac.ts` (add `countCurrentOwners`)
- Modify: `src/app/api/admin/users/route.ts:37-92` (the `_PATCH` guard)
- Test: `src/__tests__/admin-users-role-guard.test.ts` (new)

**Rules to enforce (from the issue's recommended fix):** before any role change — (a) forbid changing your own role; (b) caller must out-rank-or-equal the **target's current** role via `hasMinRole(callerRole, targetCurrentRole)`; (c) keep the existing gate that assigning `owner`/`admin` requires `owner`; (d) forbid demoting the **last** owner.

- [ ] **Step 1: Add the owner-count helper to `src/lib/rbac.ts`**

```ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
// ...existing exports...

/** Count of distinct current users holding the owner role. */
export async function countCurrentOwners(): Promise<number> {
  const rows = await db
    .select({ userId: users.userId })
    .from(users)
    .where(and(eq(users.role, "owner"), eq(users.isCurrent, true)))
    .limit(2); // we only need to know whether >1
  return rows.length;
}
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const requireAdmin = vi.fn();
vi.mock("@/lib/api-helpers", () => ({
  requireAdmin: (...a: unknown[]) => requireAdmin(...a),
  withErrorHandling: (fn: unknown) => fn,
}));

vi.mock("@/lib/rbac", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rbac")>()),
  getUserRole: vi.fn(),
  setUserRole: vi.fn().mockResolvedValue(undefined),
  countCurrentOwners: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

import { getUserRole, setUserRole, countCurrentOwners } from "@/lib/rbac";
import { PATCH } from "@/app/api/admin/users/route";

const mockedGetRole = vi.mocked(getUserRole);
const mockedSetRole = vi.mocked(setUserRole);
const mockedCountOwners = vi.mocked(countCurrentOwners);

function req(body: Record<string, unknown>) {
  return new NextRequest("https://example.com/api/admin/users", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdmin.mockResolvedValue({ session: { user: { id: "caller-1" } }, role: "admin" });
  mockedCountOwners.mockResolvedValue(2);
});

describe("PATCH /api/admin/users — rank-aware role guard (#127)", () => {
  it("rejects a non-owner admin demoting an owner", async () => {
    mockedGetRole.mockResolvedValueOnce("owner");
    const res = await PATCH(req({ targetUserId: "owner-9", role: "member" }));
    expect(res.status).toBe(403);
    expect(mockedSetRole).not.toHaveBeenCalled();
  });

  it("rejects an admin demoting a peer admin", async () => {
    mockedGetRole.mockResolvedValueOnce("admin");
    const res = await PATCH(req({ targetUserId: "admin-9", role: "viewer" }));
    expect(res.status).toBe(403);
    expect(mockedSetRole).not.toHaveBeenCalled();
  });

  it("rejects changing your own role", async () => {
    mockedGetRole.mockResolvedValueOnce("admin");
    const res = await PATCH(req({ targetUserId: "caller-1", role: "member" }));
    expect(res.status).toBe(403);
    expect(mockedSetRole).not.toHaveBeenCalled();
  });

  it("allows an owner to demote an admin to member", async () => {
    requireAdmin.mockResolvedValueOnce({ session: { user: { id: "owner-1" } }, role: "owner" });
    mockedGetRole.mockResolvedValueOnce("admin");
    const res = await PATCH(req({ targetUserId: "admin-9", role: "member" }));
    expect(res.status).toBe(200);
    expect(mockedSetRole).toHaveBeenCalledWith("admin-9", "member");
  });

  it("refuses to demote the last owner", async () => {
    requireAdmin.mockResolvedValueOnce({ session: { user: { id: "owner-1" } }, role: "owner" });
    mockedGetRole.mockResolvedValueOnce("owner");
    mockedCountOwners.mockResolvedValueOnce(1);
    const res = await PATCH(req({ targetUserId: "owner-2", role: "member" }));
    expect(res.status).toBe(403);
    expect(mockedSetRole).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- admin-users-role-guard`
Expected: FAIL — current handler returns 200 and calls `setUserRole` for the demote-owner and self cases.

- [ ] **Step 4: Implement the guard in `_PATCH`**

Update imports and insert the checks between role validation and `setUserRole` (replacing lines ~71-80):

```ts
import { setUserRole, hasMinRole, VALID_ROLES, getUserRole, countCurrentOwners, type UserRole } from "@/lib/rbac";
// ...
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // No self role changes.
  if (targetUserId === session.user.id) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 403 });
  }

  const targetCurrentRole = await getUserRole(targetUserId);

  // Caller must out-rank (or equal) the target's CURRENT role before any change.
  if (!hasMinRole(callerRole as UserRole, targetCurrentRole)) {
    return NextResponse.json({ error: "Insufficient rank for this target" }, { status: 403 });
  }

  // Assigning owner/admin still requires owner rank.
  if ((role === "owner" || role === "admin") && !hasMinRole(callerRole as UserRole, "owner")) {
    return NextResponse.json({ error: "Only owners can assign admin/owner roles" }, { status: 403 });
  }

  // Never strip the last remaining owner.
  if (targetCurrentRole === "owner" && role !== "owner" && (await countCurrentOwners()) <= 1) {
    return NextResponse.json({ error: "Cannot demote the last owner" }, { status: 403 });
  }

  await setUserRole(targetUserId, role);
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- admin-users-role-guard`
Expected: PASS (5/5).

- [ ] **Step 6: Commit**

```bash
git add src/lib/rbac.ts src/app/api/admin/users/route.ts src/__tests__/admin-users-role-guard.test.ts
git commit -m "fix(security): rank-aware guard on admin role changes + last-owner protection (closes #127)"
```

---

### Task 4: #131 — validate `callbackUrl` after MFA (open-redirect fix)

**Severity:** LOW (open redirect on a trusted post-MFA flow).

**Files:**
- Modify: `src/lib/utils.ts` (add `sanitizeCallbackUrl`)
- Modify: `src/app/auth/mfa/page.tsx:40` (use it)
- Test: `src/__tests__/utils.test.ts` (append cases)

- [ ] **Step 1: Write the failing test (append to `src/__tests__/utils.test.ts`)**

```ts
import { sanitizeCallbackUrl } from "@/lib/utils";

describe("sanitizeCallbackUrl (#131)", () => {
  it("allows a same-origin absolute path", () => {
    expect(sanitizeCallbackUrl("/dashboard/settings")).toBe("/dashboard/settings");
  });
  it("rejects protocol-relative //host", () => {
    expect(sanitizeCallbackUrl("//evil.com")).toBe("/dashboard");
  });
  it("rejects an absolute URL", () => {
    expect(sanitizeCallbackUrl("https://evil.com")).toBe("/dashboard");
  });
  it("rejects backslash tricks", () => {
    expect(sanitizeCallbackUrl("/\\evil.com")).toBe("/dashboard");
  });
  it("falls back on null/empty", () => {
    expect(sanitizeCallbackUrl(null)).toBe("/dashboard");
    expect(sanitizeCallbackUrl("")).toBe("/dashboard");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- utils`
Expected: FAIL — `sanitizeCallbackUrl` is not exported.

- [ ] **Step 3: Implement in `src/lib/utils.ts`**

```ts
/**
 * Return a safe, same-origin relative redirect path. Accepts only values that
 * begin with a single "/" (no "//" protocol-relative, no "/\" backslash trick,
 * no absolute URLs). Falls back to `fallback` otherwise.
 */
export function sanitizeCallbackUrl(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!raw || typeof raw !== "string") return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("\\")) return fallback;
  return raw;
}
```

- [ ] **Step 4: Use it in `src/app/auth/mfa/page.tsx`**

```tsx
import { sanitizeCallbackUrl } from "@/lib/utils";
// ...replace line 40:
      const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
      router.replace(callbackUrl);
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- utils`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts src/app/auth/mfa/page.tsx src/__tests__/utils.test.ts
git commit -m "fix(security): validate callbackUrl to same-origin path after MFA (closes #131)"
```

---

### Task 5: #125 — require step-up auth to re-enroll MFA over a verified credential

**Severity:** HIGH (full second-factor bypass).

**Files:**
- Modify: `src/app/api/mfa/enroll/route.ts` (gate re-enrollment)
- Test: `src/__tests__/mfa-enroll-route.test.ts` (new)

**Fix:** if a verified credential already exists (`hasMfaEnabled`), require a valid current TOTP/recovery code (`verifyMfaCode`) in the request body before allowing `enrollMfa` to overwrite the secret. First-time enrollment (no verified credential) is unchanged.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/mfa", () => ({
  enrollMfa: vi.fn(),
  hasMfaEnabled: vi.fn(),
  verifyMfaCode: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));

import { auth } from "@/lib/auth";
import { enrollMfa, hasMfaEnabled, verifyMfaCode } from "@/lib/mfa";
import { POST } from "@/app/api/mfa/enroll/route";

const mockedAuth = vi.mocked(auth);
const mockedEnroll = vi.mocked(enrollMfa);
const mockedHasMfa = vi.mocked(hasMfaEnabled);
const mockedVerify = vi.mocked(verifyMfaCode);

function req(body: Record<string, unknown> = {}) {
  return new Request("https://example.com/api/mfa/enroll", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedAuth.mockResolvedValue({ user: { id: "u1", email: "a@b.c" }, expires: "9999-12-31" } as never);
  mockedEnroll.mockResolvedValue({ uri: "otpauth://x", secret: "S", recoveryCodes: ["r1"] });
});

describe("POST /api/mfa/enroll — step-up on re-enrollment (#125)", () => {
  it("allows first-time enrollment (no verified credential)", async () => {
    mockedHasMfa.mockResolvedValueOnce(false);
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(mockedEnroll).toHaveBeenCalledTimes(1);
  });

  it("rejects re-enrollment with no current code and does NOT overwrite the secret", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    const res = await POST(req());
    expect(res.status).toBe(403);
    expect(mockedVerify).not.toHaveBeenCalledWith("u1", expect.any(String));
    expect(mockedEnroll).not.toHaveBeenCalled();
  });

  it("rejects re-enrollment with an invalid current code", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedVerify.mockResolvedValueOnce(false);
    const res = await POST(req({ currentCode: "000000" }));
    expect(res.status).toBe(403);
    expect(mockedEnroll).not.toHaveBeenCalled();
  });

  it("allows re-enrollment after a valid current code", async () => {
    mockedHasMfa.mockResolvedValueOnce(true);
    mockedVerify.mockResolvedValueOnce(true);
    const res = await POST(req({ currentCode: "123456" }));
    expect(res.status).toBe(200);
    expect(mockedEnroll).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mfa-enroll-route`
Expected: FAIL — current handler always enrolls (200) and never reads `currentCode`.

- [ ] **Step 3: Implement the guard in `src/app/api/mfa/enroll/route.ts`**

```ts
import { NextResponse } from "next/server";
import { requireUser, withErrorHandling } from "@/lib/api-helpers";
import { enrollMfa, hasMfaEnabled, verifyMfaCode } from "@/lib/mfa";
import { audit } from "@/lib/audit";

async function _POST(request: Request) {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  // Step-up: if a verified MFA credential already exists, re-enrollment must
  // prove possession of the CURRENT factor before the secret is overwritten.
  if (await hasMfaEnabled(session.user.id)) {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const currentCode = typeof body?.currentCode === "string" ? body.currentCode.trim() : "";
    if (!currentCode || !(await verifyMfaCode(session.user.id, currentCode))) {
      await audit({
        userId: session.user.id,
        action: "auth.mfa_failed",
        resource: "mfa",
        detail: { phase: "reenroll_stepup" },
        request,
      });
      return NextResponse.json(
        { error: "Current authenticator or recovery code required to re-enroll." },
        { status: 403 },
      );
    }
  }

  const { uri, secret, recoveryCodes } = await enrollMfa(session.user.id, session.user.email!);

  await audit({
    userId: session.user.id,
    action: "auth.mfa_enrolled",
    resource: "mfa",
    detail: { status: "pending_verification" },
    request,
  });

  return NextResponse.json({ uri, secret, recoveryCodes });
}

export const POST = withErrorHandling(_POST);
```

> Client note: the settings/enroll UI must send `{ currentCode }` when re-enrolling an already-verified account (surfaces the 403 as "enter your current code"). Tracked with the MFA backup-code settings work (#52); not required for this security fix to be effective server-side.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- mfa-enroll-route`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/mfa/enroll/route.ts src/__tests__/mfa-enroll-route.test.ts
git commit -m "fix(security): require step-up auth to re-enroll MFA over verified credential (closes #125)"
```

---

### Part A checkpoint

- [ ] Run the full suite: `npm test` → all green.
- [ ] Push branch, open the cluster PR, confirm CI (Task 1) is green.
- [ ] PR body lists: closes #135, #127, #131, #125 (Part A) and notes #78, #130 to follow in Part B.

---

## PART B — MFA credential schema changes (migration + backfill)

> **Why separate:** both tasks alter the `mfa_credentials` table and #78 needs a one-time backfill of existing recovery codes. Schema changes are applied with `npm run db:push` (the repo has no committed migration journal — do **not** run `db:generate`, which would emit a full-schema baseline). Run `db:push` against a **Neon branch** first to validate, then production. These tasks are not fully exercisable by mocked unit tests alone — each includes a manual DB verification step.

### Task 6: #78 — hash MFA recovery codes with bcrypt + constant-time verify

**Files:**
- Add dep: `bcryptjs` + `@types/bcryptjs`
- Modify: `src/db/schema.ts` (`mfaCredentials`: add `recoveryCodeHashes` `text("recovery_code_hashes").array()`, keep old `recoveryCodes` column until backfill completes, then drop)
- Modify: `src/lib/mfa.ts` (`enrollMfa`, `verifyMfaCode`)
- Create: `scripts/backfill-recovery-hashes.ts` (decrypt existing JSON codes → bcrypt-hash → write `recovery_code_hashes`)
- Test: `src/__tests__/mfa.test.ts` (new)

**Verify behavior (per issue #78):** valid recovery code accepted exactly once; reused code rejected; invalid rejected; verify loop runs one `bcrypt.compare` per stored hash regardless of match position (assert `bcrypt.compare` call count == hash count).

- [ ] **Step 1:** `npm i bcryptjs && npm i -D @types/bcryptjs`
- [ ] **Step 2:** Write failing `src/__tests__/mfa.test.ts` mocking `@/db`, `@/lib/encryption`, and `bcryptjs`; assert accept-once, reject-reuse, reject-invalid, and constant call-count (mock `bcrypt.compare`, assert `.mock.calls.length === hashes.length`).
- [ ] **Step 3:** Run `npm test -- src/__tests__/mfa.test.ts` → FAIL.
- [ ] **Step 4:** Add `recoveryCodeHashes` to schema; `npm run db:push` on a Neon branch.
- [ ] **Step 5:** Implement — `enrollMfa` bcrypt-hashes each code (cost ≥ 10) into `recoveryCodeHashes`; `verifyMfaCode` iterates **every** hash with `await bcrypt.compare` (no early break), records first match index, splices it out on success, persists remaining hashes.
- [ ] **Step 6:** Run `npm test -- src/__tests__/mfa.test.ts` → PASS; run full `npm test`.
- [ ] **Step 7:** Backfill: run `scripts/backfill-recovery-hashes.ts` against Neon branch; confirm every row has `recovery_code_hashes` populated and no plaintext-in-blob remains; then drop the old `recoveryCodes` column via a second `db:push` and remove it from schema.
- [ ] **Step 8:** Commit (schema + lib + script + test) — `feat(security): bcrypt-hash MFA recovery codes with constant-time verify (closes #78)`.

### Task 7: #130 — make TOTP codes single-use (persist last consumed timestep)

**Files:**
- Modify: `src/db/schema.ts` (`mfaCredentials`: add `lastTotpStep` `bigint("last_totp_step", { mode: "number" })`, nullable)
- Modify: `src/lib/mfa.ts` (`confirmMfaEnrollment`, `verifyMfaCode`)
- Test: append to `src/__tests__/mfa.test.ts`

**Approach:** `totp.validate({ token, window: 1 })` returns `delta`. Compute the consumed step `step = Math.floor(Date.now() / 1000 / 30) + delta`. Reject when `cred.lastTotpStep != null && step <= cred.lastTotpStep`; otherwise accept and persist `lastTotpStep = step`. Recovery-code path is unaffected.

- [ ] **Step 1:** Write failing test: same valid TOTP verified twice → second returns `false` (mock `otpauth` `validate` to return a fixed delta, and control `Date.now()` via `vi.setSystemTime`).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Add `lastTotpStep` to schema; `npm run db:push` on Neon branch.
- [ ] **Step 4:** Implement the step check + persistence in both TOTP verification paths.
- [ ] **Step 5:** Run `npm test` → PASS.
- [ ] **Step 6:** Commit — `fix(security): reject TOTP replay by persisting last consumed timestep (closes #130)`.

### Part B checkpoint

- [ ] Full `npm test` green; Neon-branch DB validated; production `db:push` + backfill run during deploy.
- [ ] PR updated to also close #78, #130.

---

## Self-Review

**Spec coverage:** #135 → Task 2; #127 → Task 3; #131 → Task 4; #125 → Task 5; #78 → Task 6; #130 → Task 7; plus #136 partially advanced by Task 1. All six cluster issues have a task. ✅

**Placeholder scan:** Part A tasks contain full test + implementation code, exact file paths, and exact run commands — no TBD/TODO. Part B tasks are intentionally step-outlined (not full code) because they depend on live-DB migration/backfill that can't be finalized without a Neon branch in hand; each still has concrete files, the exact schema column definitions, the algorithm, and a manual verification step. This is flagged explicitly, not a hidden gap.

**Type consistency:** `sanitizeCallbackUrl(raw, fallback="/dashboard")` used consistently (Tasks 4). `countCurrentOwners(): Promise<number>` defined in rbac (Task 3 Step 1) and consumed in the route (Step 4). `hasMinRole(caller, target)` matches the existing rbac signature. `verifyMfaCode(userId, code): Promise<boolean>` reused as the step-up check in Task 5 — matches `src/lib/mfa.ts`. ✅

**Scope:** One cluster, one PR, split into ship-ready Part A and migration-bearing Part B — right-sized. ✅

---

## Execution Log — Part A (COMPLETE)

Executed via `/claudna:implement-plan` on branch `implement/auth-authz-cluster1` → **PR #140**. Baseline 176 tests → **196 tests passing**, typecheck clean on the changed surface.

| Task | Issue | Commit | Tests |
|---|---|---|---|
| CI safety net (test-only) | #136 (partial) | `f27436e` | — |
| SCD2 carry-forward | #135 | `48518dc` | +3 |
| Strict rank guard | #127 | `6a60a6c` | +5 |
| callbackUrl sanitizer | #131 | `24b4162` | +5 |
| MFA re-enroll step-up | #125 | `44a60c3` | +4 |
| Simplify pass (drop redundant casts) | — | `e1ade04` | — |
| Rate-limit the step-up (finding A) | hardens #125 | `2afb9cf` | +3 |

**Decisions made during execution:**
- **#127 rank rule → strict out-ranking** (not the issue's literal `≥`). The issue's title/impact name peer admins as victims, which `≥` wouldn't protect; strict out-ranking blocks admin→admin and owner→owner demotions and protects the last owner implicitly. (User-ratified.)
- **Simplify pass:** dropped redundant `as UserRole` casts; skipped the MFA enroll double-read (cold path; fix would change shared `verifyMfaCode` semantics) and the `sanitizeCallbackUrl` `typeof` guard (kept as defensive).
- **Altitude finding A (step-up brute-forceable):** fixed in-PR — rate-limited via the shared `mfa:${userId}` bucket.
- **Altitude finding B (deprovision self-target / last-owner):** pre-existing and outside #127's role-PATCH scope → filed as follow-up **#139**.

**Deferred:** Part B (#78 bcrypt recovery codes, #130 TOTP single-use) — needs the `mfa_credentials` schema change + backfill.

---

## Execution Log — Part B (COMPLETE — code; live migration pending owner)

Executed via `/claudna:implement-plan` on branch `implement/mfa-credential-hardening`. Baseline 196 tests → **208 passing**, typecheck clean on the changed surface. Code + tests + backfill script + migration runbook ship in the PR; the live `db:push` + backfill are the owner's to run per the runbook (chosen model: **"code + runbook, you run the DB"**).

| Task | Issue | Commit | Notes |
|---|---|---|---|
| bcrypt recovery codes + single-use TOTP | #78, #130 | `985aa97` | schema (`recovery_code_hashes`, `last_totp_step`, `recovery_codes` nullable) + `mfa.ts` + 11 tests |
| Backfill script + migration runbook | #78 | `54dbae6` | `scripts/backfill-recovery-hashes.ts`, `db:backfill:recovery`, runbook, `.env.branch` gitignore |
| Simplify pass (dedup replay guard + recovery-fallback fix) | hardens #78 | `b019f26` | +2 tests |

**Decisions / deviations from the Part B outline:**
- **Expand/contract, not in-place replace.** Task 6's outline said to *drop* the old `recoveryCodes` column here. Instead this PR keeps it (made nullable) plus a legacy read fallback, so the migration is rollback-safe; the column drop + fallback removal are deferred to follow-up **#142** (run after prod backfill is verified).
- **`recoveryCodeHashes IS NOT NULL` is the scheme signal** (not array length). The altitude review caught that a length-based branch would let a backfilled user who spent *all* hashed codes fall back to the still-present legacy blob and reuse them; branching on non-null closes that. (Fixed in `b019f26`.)
- **bcryptjs 3.x self-types** → dropped the redundant `@types/bcryptjs`; added `tsx` to run the backfill under the `@/`-alias-free path.
- **Migration is owner-run.** No code path executes `db:push`/backfill and the session has no verified-safe DB — see `2026-07-30-cluster1-partB-mfa-migration-runbook.md`.

**Closes:** #78, #130. **Follow-up filed:** #142 (drop legacy column + fallback post-backfill).
