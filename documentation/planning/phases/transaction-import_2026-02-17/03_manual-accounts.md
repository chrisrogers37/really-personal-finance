# Phase 03: Manual Accounts

**PR Title:** feat: add manual account creation for imported transactions
**Risk:** Low | **Effort:** Low | **Status:** 🔧 IN PROGRESS
**Started:** 2026-02-17

## Context

Imported transactions need an account to belong to. Currently, accounts can only be created through Plaid Link. This phase adds a simple API + UI for creating manual accounts (e.g., "Amex Platinum", "BofA Checking") that imported transactions will be assigned to.

## Dependencies

- **Blocks:** Phase 04 (import API)
- **Blocked by:** Phase 01 (schema — needs nullable Plaid fields + account source column)

## Files Created

- `src/app/api/accounts/route.ts` — GET (list) + POST (create) manual accounts
- (none — validation added to existing `src/lib/validation.ts`)
- `src/app/dashboard/import/page.tsx` — Minimal placeholder page (full UI in Phase 05)

## Files Modified

- `src/app/dashboard/layout.tsx` — add "Import" nav link with `Upload` icon to sidebar

## Detailed Implementation

### 1. Accounts API route (`src/app/api/accounts/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET /api/accounts — list user's accounts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAccounts = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      subtype: accounts.subtype,
      mask: accounts.mask,
      source: accounts.source,
    })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));

  return NextResponse.json({ accounts: userAccounts });
}

// POST /api/accounts — create manual account
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, type, subtype, mask } = await request.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Account name is required" }, { status: 400 });
  }
  if (!type || typeof type !== "string") {
    return NextResponse.json({ error: "Account type is required" }, { status: 400 });
  }

  const validTypes = ["checking", "savings", "credit", "investment", "other"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(accounts)
    .values({
      userId: session.user.id,
      name: name.trim(),
      type,
      subtype: subtype?.trim() || null,
      mask: mask?.trim() || null,
      source: "import",
      // Plaid fields left null for manual accounts
    })
    .returning();

  return NextResponse.json({
    account: {
      id: created.id,
      name: created.name,
      type: created.type,
      subtype: created.subtype,
      mask: created.mask,
      source: created.source,
    },
  });
}
```

### 2. Extract account validation (`src/lib/validation/accounts.ts`)

Pure function for validating account creation input — testable without mocking Next.js or auth:

```typescript
export const VALID_ACCOUNT_TYPES = ["checking", "savings", "credit", "investment", "other"] as const;
export type AccountType = (typeof VALID_ACCOUNT_TYPES)[number];

export function validateAccountInput(input: unknown): { name: string; type: AccountType; subtype: string | null; mask: string | null } | { error: string } { ... }
```

Route handler calls this and returns 400 if error, proceeds if valid.

### 3. Add "Import" to sidebar navigation

In `src/app/dashboard/layout.tsx`, add `Upload` icon import and nav item (after Merchants):

```typescript
import { Upload } from "lucide-react";
// ...
{ href: "/dashboard/import", label: "Import", icon: Upload },
```

### 4. Placeholder import page (`src/app/dashboard/import/page.tsx`)

Minimal page so the nav link doesn't 404. Just a heading — Phase 05 replaces this entirely.

### 3. Protect the import route in middleware

The existing middleware matcher already covers `/dashboard/:path*`, so `/dashboard/import` is automatically protected. No changes needed.

## Test Plan

1. **API test (manual):**
   - POST `/api/accounts` with `{ name: "Amex Platinum", type: "credit" }` → 201 with account object
   - POST `/api/accounts` with `{ name: "" }` → 400 error
   - POST `/api/accounts` with `{ name: "Test", type: "invalid" }` → 400 error
   - GET `/api/accounts` → returns both Plaid and manual accounts
   - Unauthenticated request → 401

2. **Unit test** (`src/__tests__/accounts.test.ts`):
   - Test `validateAccountInput` pure function:
     - Valid input returns parsed result
     - Empty/missing name returns error
     - Missing type returns error
     - Invalid type returns error
     - Trims name/subtype/mask whitespace
     - Null for empty optional fields

## Verification Checklist

- [ ] POST creates account with `source: "import"` and null Plaid fields
- [ ] GET returns all accounts (both Plaid and manual)
- [ ] Sidebar shows "Import" link
- [ ] No existing Plaid functionality broken

## What NOT To Do

- Don't add account editing or deletion — out of scope for this feature
- Don't add an account creation modal/page yet — Phase 05 (Import UI) will inline it into the import flow
- Don't modify the Plaid exchange-token route — it stays as-is with its own account creation
