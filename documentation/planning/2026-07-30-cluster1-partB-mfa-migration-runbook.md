# Cluster 1 Part B — MFA credential migration runbook

**Scope:** the live-DB steps for `#78` (bcrypt recovery codes) and `#130`
(single-use TOTP). The code + tests ship in PR for this branch; **this document
is the human-run part** — a schema push plus a one-time recovery-code backfill.

**Owner runs this. Nothing here executes automatically.**

---

## What the code change assumes

`src/db/schema.ts` (`mfa_credentials`) now has:

| Column | Change | Purpose |
|---|---|---|
| `recovery_code_hashes` | **new** `text[]`, nullable | bcrypt hashes of the recovery codes (#78) |
| `last_totp_step` | **new** `bigint`, nullable | last consumed TOTP timestep, blocks replay (#130) |
| `recovery_codes` | now **nullable** (was `NOT NULL`) | legacy encrypted blob, read-only fallback until backfilled |

The app **reads hashes if present, else falls back** to the legacy
`recovery_codes` blob (`verifyMfaCode` → `verifyRecoveryCode`). No user is
locked out during the transition. New enrollments write hashes only.

## Ordering (why this order matters)

1. **Push schema** — additive + a `DROP NOT NULL`; old code ignores the new
   columns, so it stays safe to run before the code deploys.
2. **Backfill** — populate `recovery_code_hashes` for existing rows **before**
   the new code serves traffic, so every verified user has hashes the moment the
   new `verifyMfaCode` goes live. (The legacy fallback covers any row that
   somehow isn't backfilled, so a small skew is non-fatal — but backfill-first
   keeps the fallback unused.)
3. **Deploy code** (merge the PR).
4. **Later:** drop `recovery_codes` + delete the legacy fallback — see the
   column-drop follow-up issue. Do **not** do this until prod backfill is
   verified.

## Preconditions

- **`ENCRYPTION_KEY` parity.** The backfill *decrypts* `recovery_codes` with
  `ENCRYPTION_KEY`, so it must be the **same key the app encrypted with**
  (i.e. prod's key), even when pointed at a Neon branch — a branch is a copy of
  prod data encrypted with prod's key. A wrong key makes `decrypt` throw and the
  script aborts *before* writing anything (fail-loud, no corruption).
- **Migrations use `db:push`, never `db:generate`.** The repo has no committed
  migration journal; `db:generate` would emit a full-schema baseline. `db:push`
  diffs the live DB and prompts.
- **`.env.branch` is git-ignored** (added to `.gitignore` in this change) — it
  carries a real connection string, so keep it out of commits.

---

## Step 1 — Validate on a Neon branch (never prod first)

1. **Create a throwaway Neon branch** of production (Neon console → *Branches* →
   *New branch*, or `neonctl branches create`). Copy its pooled connection
   string.

2. **Create `.env.branch`** — branch URL, **prod** encryption key:

   ```
   DATABASE_URL=<neon-branch-connection-string>
   ENCRYPTION_KEY=<the-same-64-hex-key-prod-uses>
   ```

3. **Push the schema to the branch:**

   ```bash
   DATABASE_URL="<neon-branch-connection-string>" npm run db:push
   ```

   `drizzle-kit push` reads `DATABASE_URL` from the environment and prints the
   statements before applying. It should propose
   **only** these three (against `mfa_credentials`) — if it proposes anything
   else, the branch has drift; stop and investigate:

   ```sql
   ALTER TABLE "mfa_credentials" ADD COLUMN "recovery_code_hashes" text[];
   ALTER TABLE "mfa_credentials" ADD COLUMN "last_totp_step" bigint;
   ALTER TABLE "mfa_credentials" ALTER COLUMN "recovery_codes" DROP NOT NULL;
   ```

4. **Dry-run the backfill** (writes nothing):

   ```bash
   npx tsx --env-file=.env.branch scripts/backfill-recovery-hashes.ts --dry-run
   ```

   Confirm the "would hash N code(s)" count matches the number of enrolled users.

5. **Run the backfill for real:**

   ```bash
   npx tsx --env-file=.env.branch scripts/backfill-recovery-hashes.ts
   ```

6. **Verify on the branch** (psql / Neon SQL editor):

   ```sql
   -- Must return 0: no verified row left with a legacy blob but no hashes.
   SELECT count(*) FROM mfa_credentials
   WHERE (recovery_code_hashes IS NULL OR cardinality(recovery_code_hashes) = 0)
     AND recovery_codes IS NOT NULL;

   -- Spot-check: hashes look like bcrypt ($2b$10$…), one entry per code.
   SELECT user_id, cardinality(recovery_code_hashes) AS n, left(recovery_code_hashes[1], 7) AS sample
   FROM mfa_credentials WHERE recovery_code_hashes IS NOT NULL LIMIT 5;
   ```

7. **Smoke-test against the branch** (optional but recommended): point a local
   app instance at `.env.branch` and confirm a recovery code + a TOTP both
   verify, and the same TOTP is rejected on immediate reuse. Then delete the
   Neon branch.

---

## Step 2 — Production

1. **Push the schema to prod** (review the same three statements):

   ```bash
   npm run db:push          # uses .env (prod DATABASE_URL)
   ```

2. **Backfill prod** — dry-run first, then for real:

   ```bash
   npm run db:backfill:recovery -- --dry-run
   npm run db:backfill:recovery
   ```

   (`db:backfill:recovery` loads `.env` via `--env-file`. Re-runnable — already
   hashed rows are skipped.)

3. **Verify prod** with the same two queries from Step 1.6 (the first must
   return `0`).

4. **Deploy the code** — merge the PR. New enrollments now write hashes; the
   backfilled rows verify via the hash path.

---

## Step 3 — Contract (follow-up, not now)

Once prod backfill is verified and the deploy is stable, the **column-drop
follow-up issue** covers:

- remove the legacy fallback branch in `verifyRecoveryCode` (`src/lib/mfa.ts`),
- drop `recovery_codes` from the schema, `npm run db:push`.

---

## Rollback

- **Before the code deploys:** the schema change is backward-compatible (old
  code ignores the new columns; `recovery_codes` is still populated). Nothing to
  undo — just don't deploy.
- **After deploy, if needed:** revert the app to the previous release. The
  legacy `recovery_codes` blob is still intact (this migration never clears it),
  so the old code keeps working. Do not drop `recovery_codes` until you are
  certain no rollback is needed — that is exactly why the drop is a separate
  follow-up.
