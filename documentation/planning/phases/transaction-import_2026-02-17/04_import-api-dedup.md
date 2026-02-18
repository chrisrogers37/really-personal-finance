# Phase 04: Import API + Duplicate Detection

**PR Title:** feat: add transaction import API with duplicate detection
**Risk:** Medium | **Effort:** Medium | **Status:** 🔧 IN PROGRESS
**Started:** 2026-02-17

## Context

The core import logic: accept parsed transactions, detect duplicates against existing data, return a preview for user confirmation, then insert confirmed transactions. Two-step flow: preview → confirm.

## Dependencies

- **Blocks:** Phase 05 (import UI)
- **Blocked by:** Phase 01 (schema), Phase 02 (parsers), Phase 03 (manual accounts)

## Files Created

- `src/lib/import.ts` — generateImportId, validateConfirmInput, types (pure, no DB dependency)
- `src/app/api/import/preview/route.ts` — POST: parse file + detect duplicates (findDuplicates inline)
- `src/app/api/import/confirm/route.ts` — POST: insert confirmed transactions
- `src/__tests__/import.test.ts` — unit tests for generateImportId and validateConfirmInput

## Challenge Round Decisions (2026-02-17)

1. **Date filter bug fixed** — Original plan had placeholder comment instead of actual gte/lte filter. Now implements proper date range filtering.
2. **Collapsed findDuplicates + findFuzzyDuplicates** — Single `findDuplicates` function. One query for existing transactions in date range, checks both exact importId and fuzzy date+amount in memory. Dropped separate `findDuplicates(Set)` function that was never called directly by routes.
3. **Dropped `plaid_match` reason** — Redundant with `same_date_amount`. The existing transaction's `source` field already tells the UI whether it came from Plaid.
4. **Static imports in confirm route** — Dynamic `await import()` replaced with static imports to match every other route in the codebase.
5. **Added runtime validation on confirm endpoint** — `validateConfirmInput` validates accountId + each transaction's required fields at runtime, matching the `validateAccountInput` pattern.

## Detailed Implementation

### 1. Import utilities (`src/lib/import.ts`)

```typescript
import { createHash } from "crypto";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import type { ParsedTransaction } from "@/lib/parsers/types";

export function generateImportId(txn: ParsedTransaction): string {
  if (txn.externalId) {
    return `fitid:${txn.externalId}`;
  }
  const raw = `${txn.date}|${txn.description.trim().toLowerCase()}|${txn.amount}`;
  return `hash:${createHash("sha256").update(raw).digest("hex").substring(0, 32)}`;
}

export interface DuplicateMatch {
  importIndex: number;
  existingTransaction: {
    id: string;
    date: string;
    name: string;
    amount: string;
    source: string;
  };
  reason: "exact_import_id" | "same_date_amount";
}

export async function findDuplicates(
  userId: string,
  parsed: ParsedTransaction[],
  importIds: string[]
): Promise<DuplicateMatch[]> {
  if (parsed.length === 0) return [];

  const dates = parsed.map(t => t.date);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));

  const existing = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      name: transactions.name,
      amount: transactions.amount,
      importId: transactions.importId,
      source: transactions.source,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, minDate),
        lte(transactions.date, maxDate)
      )
    );

  const existingImportIds = new Set(
    existing.filter(e => e.importId).map(e => e.importId!)
  );

  const duplicates: DuplicateMatch[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const txn = parsed[i];
    const importId = importIds[i];

    if (existingImportIds.has(importId)) {
      const match = existing.find(e => e.importId === importId);
      if (match) {
        duplicates.push({
          importIndex: i,
          existingTransaction: {
            id: match.id,
            date: match.date,
            name: match.name,
            amount: match.amount,
            source: match.source,
          },
          reason: "exact_import_id",
        });
        continue;
      }
    }

    const fuzzyMatch = existing.find(
      e =>
        e.date === txn.date &&
        Math.abs(parseFloat(e.amount) - parseFloat(txn.amount)) < 0.01
    );

    if (fuzzyMatch) {
      duplicates.push({
        importIndex: i,
        existingTransaction: {
          id: fuzzyMatch.id,
          date: fuzzyMatch.date,
          name: fuzzyMatch.name,
          amount: fuzzyMatch.amount,
          source: fuzzyMatch.source,
        },
        reason: "same_date_amount",
      });
    }
  }

  return duplicates;
}

export interface ConfirmInput {
  accountId: string;
  transactions: ConfirmTransaction[];
}

export interface ConfirmTransaction {
  date: string;
  description: string;
  amount: string;
  merchantName?: string;
  importId: string;
}

export function validateConfirmInput(
  input: unknown
): ConfirmInput | { error: string } {
  if (!input || typeof input !== "object") {
    return { error: "Request body is required" };
  }

  const { accountId, transactions: txns } = input as Record<string, unknown>;

  if (!accountId || typeof accountId !== "string") {
    return { error: "accountId is required" };
  }
  if (!Array.isArray(txns) || txns.length === 0) {
    return { error: "transactions array is required and must not be empty" };
  }

  const validated: ConfirmTransaction[] = [];
  for (let i = 0; i < txns.length; i++) {
    const t = txns[i];
    if (!t || typeof t !== "object") {
      return { error: `Transaction at index ${i} is invalid` };
    }
    const { date, description, amount, importId, merchantName } = t as Record<
      string,
      unknown
    >;
    if (!date || typeof date !== "string") {
      return { error: `Transaction at index ${i}: date is required` };
    }
    if (!description || typeof description !== "string") {
      return { error: `Transaction at index ${i}: description is required` };
    }
    if (!amount || typeof amount !== "string") {
      return { error: `Transaction at index ${i}: amount is required` };
    }
    if (!importId || typeof importId !== "string") {
      return { error: `Transaction at index ${i}: importId is required` };
    }
    validated.push({
      date,
      description,
      amount,
      importId,
      merchantName:
        typeof merchantName === "string" && merchantName.trim()
          ? merchantName.trim()
          : undefined,
    });
  }

  return { accountId, transactions: validated };
}
```

### 2. Preview endpoint (`src/app/api/import/preview/route.ts`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseTransactionFile } from "@/lib/parsers";
import { generateImportId, findDuplicates } from "@/lib/import";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const content = await file.text();
  const result = parseTransactionFile(content, file.name);

  if (result.transactions.length === 0) {
    return NextResponse.json({
      error: "No transactions found in file",
      parseErrors: result.errors,
    }, { status: 400 });
  }

  const importIds = result.transactions.map(generateImportId);
  const duplicates = await findDuplicates(session.user.id, result.transactions, importIds);
  const dupIndexes = new Set(duplicates.map(d => d.importIndex));

  return NextResponse.json({
    format: result.format,
    accountHint: result.accountHint,
    totalCount: result.transactions.length,
    newCount: result.transactions.length - dupIndexes.size,
    duplicateCount: dupIndexes.size,
    transactions: result.transactions.map((txn, i) => ({
      ...txn,
      importId: importIds[i],
      isDuplicate: dupIndexes.has(i),
    })),
    duplicates,
    parseErrors: result.errors,
  });
}
```

### 3. Confirm endpoint (`src/app/api/import/confirm/route.ts`)

Static imports. Runtime validation via validateConfirmInput.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, accounts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { validateConfirmInput } from "@/lib/import";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = validateConfirmInput(body);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, result.accountId), eq(accounts.userId, session.user.id)))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  let inserted = 0;
  for (let i = 0; i < result.transactions.length; i += 100) {
    const batch = result.transactions.slice(i, i + 100);
    const values = batch.map(txn => ({
      accountId: result.accountId,
      userId: session.user.id,
      amount: txn.amount,
      date: txn.date,
      name: txn.description,
      merchantName: txn.merchantName || null,
      importId: txn.importId,
      source: "import" as const,
      pending: false,
    }));

    await db
      .insert(transactions)
      .values(values)
      .onConflictDoNothing({ target: transactions.importId });

    inserted += values.length;
  }

  return NextResponse.json({
    success: true,
    imported: inserted,
  });
}
```

### 4. Import ID index

The `importId` column and index from Phase 01 is what makes dedup queries fast. The `onConflictDoNothing` on `importId` is a safety net — even if the preview missed a duplicate, the insert won't create a duplicate row.

Note: `onConflictDoNothing` requires a unique constraint on `importId`. This was set up in Phase 01 with `importId: text("import_id").unique()`.

## Test Plan (`src/__tests__/import.test.ts`)

1. **generateImportId:**
   - OFX transaction with FITID → returns `"fitid:<fitid>"`
   - CSV transaction without externalId → returns `"hash:<32-char-hex>"`
   - Same inputs → same output (deterministic)
   - Different amounts → different hashes
   - Whitespace/case normalization in description

2. **validateConfirmInput:**
   - Valid input with all fields
   - Valid input with only required fields
   - Rejects missing accountId
   - Rejects empty transactions array
   - Rejects transaction missing required field (date, description, amount, importId)
   - Rejects null input

3. **API integration (manual):**
   - Upload Amex CSV → preview shows transactions, 0 duplicates
   - Upload same file again → preview shows all as duplicates
   - Confirm import → transactions appear in dashboard
   - Upload BofA CSV → different account, 0 duplicates

## Verification Checklist

- [ ] Preview endpoint parses file and returns structured response
- [ ] Duplicate detection catches exact import ID matches
- [ ] Fuzzy matching catches same-date-amount across sources
- [ ] Confirm endpoint inserts with `source: "import"` and `importId`
- [ ] Re-importing same file shows all as duplicates
- [ ] Batch insert handles large files (500+ transactions)
- [ ] Runtime validation rejects malformed confirm requests

## What NOT To Do

- Don't use the `plaidTransactionId` field for imported transactions — leave it null
- Don't delete or modify existing transactions during import — import is additive only
- Don't skip the preview step — always require user confirmation before inserting
- Don't store the raw file — only store parsed transaction data
- Don't use a transaction wrapper for the batch insert — the neon-http driver has limitations with chained queries in transactions. Use `onConflictDoNothing` as the safety net instead
- Don't use dynamic imports — use static imports like every other route in the codebase
