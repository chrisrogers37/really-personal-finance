# Phase 01: SCD2 Transaction Safety and Deduplication

## PR Metadata

| Field | Value |
|-------|-------|
| **PR Title** | `fix: wrap SCD2 updates in database transactions and deduplicate logic` |
| **Risk Level** | **Medium** -- Touches authentication adapter (NextAuth) and data integrity logic |
| **Estimated Effort** | 2-3 hours experienced / 4-6 hours junior |
| **Files Modified** | `src/lib/scd2.ts`, `src/lib/auth.ts` |
| **Files NOT Modified** | `src/db/index.ts`, `src/db/schema.ts`, `src/app/api/profile/route.ts` |

## Dependencies and Blocks

- **Blocks:** Phase 04 (code deduplication modifies some of the same files)
- **Blocked by:** Nothing
- **Can run in parallel with:** Phase 02, Phase 03
- **No new packages required**
- **No schema changes required**

## Problem Statement

### Bug 1: No Transaction Wrapping (Data Corruption Risk)

In `src/lib/scd2.ts` lines 28-44, the SCD2 update performs two separate database operations:
1. **Lines 28-31**: UPDATE to close the current row (`isCurrent = false`, set `validTo`)
2. **Lines 34-44**: INSERT to create the new row (`isCurrent = true`, new `validFrom`)

If the process crashes between step 1 and step 2, the user will have **zero current rows** -- their old row is closed but no new row was created. The user becomes invisible to all queries that filter on `isCurrent = true`, effectively locking them out.

The same bug exists independently in `src/lib/auth.ts` lines 96-115.

### Bug 2: Duplicated SCD2 Logic

The SCD2 close-and-insert pattern is implemented in two places:
- `src/lib/scd2.ts` lines 10-47 (`updateUserProfile`)
- `src/lib/auth.ts` lines 82-123 (`adapter.updateUser`)

They have a subtle divergence in `emailVerified` handling:
- `scd2.ts` line 40: Always carries forward `current.emailVerified`
- `auth.ts` lines 108-111: Allows explicit override of `emailVerified`

The auth adapter version is more correct because NextAuth passes `emailVerified` when verifying a user's email.

### Neon HTTP Driver Transaction Support

The project uses `drizzle-orm/neon-http` (see `src/db/index.ts` line 2). With `drizzle-orm ^0.45.1`, this driver **does** support `db.transaction()` via Neon's HTTP transaction API (batched statements).

**Important constraint**: Inside a `neon-http` transaction callback, you cannot use the result of one query as input to another (all queries are batched). So the SELECT must remain outside the transaction, with the UPDATE + INSERT inside.

---

## Step-by-Step Implementation

### Step 1: Modify `src/lib/scd2.ts`

**BEFORE** (current file, lines 1-59):

```typescript
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Updates a user profile using SCD2 pattern:
 * 1. Close the current row (set valid_to + is_current = false)
 * 2. Insert a new row with updated values (valid_from = now, is_current = true)
 */
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; email?: string }
) {
  // Get current version
  const [current] = await db
    .select()
    .from(users)
    .where(and(eq(users.userId, userId), eq(users.isCurrent, true)))
    .limit(1);

  if (!current) {
    throw new Error("User not found");
  }

  const now = new Date();

  // Close current row
  await db
    .update(users)
    .set({ validTo: now, isCurrent: false })
    .where(eq(users.id, current.id));

  // Insert new version
  const [newVersion] = await db
    .insert(users)
    .values({
      userId: current.userId,
      email: updates.email ?? current.email,
      name: updates.name ?? current.name,
      emailVerified: current.emailVerified,
      validFrom: now,
      isCurrent: true,
    })
    .returning();

  return newVersion;
}

/**
 * Get the full history of a user's profile changes
 */
export async function getUserHistory(userId: string) {
  return db
    .select()
    .from(users)
    .where(eq(users.userId, userId))
    .orderBy(users.validFrom);
}
```

**AFTER** (replace entire file):

```typescript
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Updates a user profile using SCD2 pattern:
 * 1. Close the current row (set valid_to + is_current = false)
 * 2. Insert a new row with updated values (valid_from = now, is_current = true)
 *
 * Both operations are wrapped in a transaction to prevent data corruption
 * if the process fails between step 1 and step 2.
 */
export async function updateUserProfile(
  userId: string,
  updates: { name?: string; email?: string; emailVerified?: Date | null }
) {
  // Read current version outside the transaction.
  // The neon-http driver batches transaction queries, so we cannot
  // use one query's result as input to another within the same transaction.
  const [current] = await db
    .select()
    .from(users)
    .where(and(eq(users.userId, userId), eq(users.isCurrent, true)))
    .limit(1);

  if (!current) {
    throw new Error("User not found");
  }

  const now = new Date();

  // Wrap close + insert in a transaction for atomicity.
  // If either operation fails, both are rolled back.
  const [newVersion] = await db.transaction(async (tx) => {
    // Close current row
    await tx
      .update(users)
      .set({ validTo: now, isCurrent: false })
      .where(eq(users.id, current.id));

    // Insert new version
    return tx
      .insert(users)
      .values({
        userId: current.userId,
        email: updates.email ?? current.email,
        name: updates.name ?? current.name,
        emailVerified:
          updates.emailVerified !== undefined
            ? updates.emailVerified
            : current.emailVerified,
        validFrom: now,
        isCurrent: true,
      })
      .returning();
  });

  return newVersion;
}

/**
 * Get the full history of a user's profile changes
 */
export async function getUserHistory(userId: string) {
  return db
    .select()
    .from(users)
    .where(eq(users.userId, userId))
    .orderBy(users.validFrom);
}
```

**Changes:**
1. Line 15: Added `emailVerified?: Date | null` to the `updates` type parameter
2. Lines 35-55: Wrapped UPDATE + INSERT in `db.transaction(async (tx) => { ... })`, changed `db.` to `tx.` inside
3. Lines 48-50: Updated `emailVerified` handling to support explicit override

### Step 2: Modify `src/lib/auth.ts` -- Add import

**BEFORE** (lines 1-6):
```typescript
import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import { db } from "@/db";
import { users, sessions, verificationTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
```

**AFTER** (lines 1-7):
```typescript
import NextAuth from "next-auth";
import Email from "next-auth/providers/email";
import { updateUserProfile } from "@/lib/scd2";
import { db } from "@/db";
import { users, sessions, verificationTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
```

### Step 3: Modify `src/lib/auth.ts` -- Replace `updateUser` method

**BEFORE** (lines 82-123):
```typescript
    async updateUser(user) {
      if (!user.id) throw new Error("User ID required");
      // SCD2: close current row and insert new version
      const [current] = await db
        .select()
        .from(users)
        .where(and(eq(users.userId, user.id), eq(users.isCurrent, true)))
        .limit(1);

      if (!current) throw new Error("User not found");

      const now = new Date();

      // Close current row
      await db
        .update(users)
        .set({ validTo: now, isCurrent: false })
        .where(eq(users.id, current.id));

      // Insert new version
      const [updated] = await db
        .insert(users)
        .values({
          userId: current.userId,
          email: user.email ?? current.email,
          name: user.name ?? current.name,
          emailVerified:
            user.emailVerified !== undefined
              ? user.emailVerified
              : current.emailVerified,
          validFrom: now,
          isCurrent: true,
        })
        .returning();

      return {
        id: updated.userId,
        email: updated.email,
        name: updated.name,
        emailVerified: updated.emailVerified,
      };
    },
```

**AFTER** (replace lines 82-123 with):
```typescript
    async updateUser(user) {
      if (!user.id) throw new Error("User ID required");

      const updated = await updateUserProfile(user.id, {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        emailVerified: user.emailVerified,
      });

      return {
        id: updated.userId,
        email: updated.email,
        name: updated.name,
        emailVerified: updated.emailVerified,
      };
    },
```

### Step 4: Add comment to `deleteUser` (NO logic change)

**BEFORE** (lines 125-131):
```typescript
    async deleteUser(userId) {
      // Mark all versions as not current
      await db
        .update(users)
        .set({ validTo: new Date(), isCurrent: false })
        .where(eq(users.userId, userId));
    },
```

**AFTER:**
```typescript
    async deleteUser(userId) {
      // Mark all versions as not current.
      // Single UPDATE statement -- inherently atomic in PostgreSQL,
      // no explicit transaction needed.
      await db
        .update(users)
        .set({ validTo: new Date(), isCurrent: false })
        .where(eq(users.userId, userId));
    },
```

**Do NOT wrap `deleteUser` in a transaction.** It is a single SQL statement, which is inherently atomic in PostgreSQL.

---

## Existing Caller Compatibility

The existing caller in `src/app/api/profile/route.ts` (lines 44-47) does NOT pass `emailVerified`:

```typescript
const updated = await updateUserProfile(session.user.id, {
  name: name ?? undefined,
  email: email ?? undefined,
});
```

Since `emailVerified` is not in this object, `updates.emailVerified` is `undefined`, and the `!== undefined` check correctly falls back to `current.emailVerified`. **No changes needed to this file.**

---

## Verification Checklist

### Compilation
- [ ] `npx tsc --noEmit` -- zero type errors
- [ ] `npm run lint` -- zero new lint errors
- [ ] `npm run build` -- build succeeds

### Functional Testing (Manual)
- [ ] Sign in via email magic link -- verification flow works
- [ ] `PUT /api/profile` with `{ "name": "New Name" }` -- old row has `is_current = false` and non-null `valid_to`; new row has `is_current = true`
- [ ] `GET /api/profile/history` -- both old and new rows appear
- [ ] Email verification after sign-in sets `emailVerified` on user

### Transaction Atomicity Testing
- [ ] Temporarily add `throw new Error("test rollback")` after the UPDATE but before the INSERT inside `db.transaction()` in `scd2.ts`
- [ ] Call `PUT /api/profile` -- expect 500 error
- [ ] Verify the database still has exactly one row with `is_current = true` (the old row was NOT closed)
- [ ] Remove the `throw` after testing

### Code Review Checks
- [ ] `scd2.ts` uses `tx.update()` and `tx.insert()` (NOT `db.update()` and `db.insert()`) inside the transaction callback
- [ ] `auth.ts` imports `updateUserProfile` from `@/lib/scd2`
- [ ] `auth.ts` `updateUser` method calls `updateUserProfile`, not duplicated logic
- [ ] No changes to `src/db/index.ts`, `src/db/schema.ts`, or `src/app/api/profile/route.ts`

---

## What NOT To Do

1. **Do NOT switch from `neon-http` to `neon-serverless`.** The HTTP driver supports `db.transaction()` in drizzle-orm 0.45+. Do not change `src/db/index.ts`.

2. **Do NOT move the SELECT inside the transaction.** The `neon-http` driver batches all queries within a transaction callback. You cannot use one query's result as input to another. The SELECT must remain outside.

3. **Do NOT change the return type of `updateUserProfile`.** It returns the full Drizzle row object. The profile route accesses `updated.userId`, `updated.email`, `updated.name`.

4. **Do NOT add `emailVerified` as a required parameter.** It must be optional. Existing callers do not pass it.

5. **Do NOT change `createUser` in `auth.ts`.** It is a single INSERT -- no transaction needed.

6. **Do NOT refactor `deleteUser` into `scd2.ts`.** Deletion is a fundamentally different operation from SCD2 versioned update.

7. **Do NOT use `try/catch` inside the transaction callback to suppress errors.** Let errors propagate so the transaction rolls back automatically.

8. **Do NOT change `getUserHistory`.** It is a read-only query with no transaction concern.
