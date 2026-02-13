# Phase 04: Code Deduplication and Cleanup

**Status:** 🔧 IN PROGRESS
**Started:** 2026-02-12

## PR Metadata

| Field | Value |
|-------|-------|
| **PR Title** | `refactor: deduplicate types, utilities, and UI components` |
| **Risk Level** | **Low** -- Refactoring, no business logic changes |
| **Estimated Effort** | 2-3 hours |
| **Files Modified** | 10 existing files + 2 new files |

## Files Modified

| File | Change |
|------|--------|
| `src/types/index.ts` | **NEW** -- shared TypeScript interfaces |
| `src/components/date-range-filter.tsx` | **NEW** -- shared date filter component |
| `src/lib/telegram.ts` | Remove `formatCurrency` (duplicate) |
| `src/lib/alerts.ts` | Change import of `formatCurrency` from `telegram` to `utils` |
| `src/components/transaction-table.tsx` | Import `Transaction` from shared types |
| `src/app/dashboard/transactions/page.tsx` | Import `Transaction` from shared types |
| `src/app/dashboard/categories/page.tsx` | Import shared types + use `DateRangeFilter` |
| `src/app/dashboard/merchants/page.tsx` | Import shared types + use `DateRangeFilter` |
| `src/components/plaid-link.tsx` | Fix render side-effect with `useEffect` |
| `src/app/api/profile/route.ts` | Remove dead code + unused import |

## Dependencies and Blocks

- **Blocks:** Nothing
- **Blocked by:** Phase 01 (modifies `src/lib/auth.ts` which imports from `scd2.ts`)
- **Cannot run in parallel with:** Phase 01

---

## Step-by-Step Implementation

### Step 1: Create shared types file

**NEW FILE:** `src/types/index.ts`

```typescript
export interface Transaction {
  id: string;
  amount: string;
  date: string;
  name: string;
  merchantName: string | null;
  categoryPrimary: string | null;
  categoryDetailed: string | null;
  pending: boolean;
  accountName: string | null;
  accountType: string | null;
}

export interface CategoryData {
  category: string;
  total: number;
  count: number;
}

export interface MerchantData {
  merchant: string;
  total: number;
  count: number;
  avgAmount: number;
  isRecurring: boolean;
}
```

### Step 2: Update `src/components/transaction-table.tsx`

**BEFORE** (lines 1-21):
```typescript
"use client";

import { formatCurrency, formatDate } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: string;
  date: string;
  name: string;
  merchantName: string | null;
  categoryPrimary: string | null;
  categoryDetailed: string | null;
  pending: boolean;
  accountName: string | null;
  accountType: string | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
}
```

**AFTER** (lines 1-10):
```typescript
"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
}
```

Delete the local `Transaction` interface (lines 5-16 in original).

### Step 3: Update `src/app/dashboard/transactions/page.tsx`

**BEFORE** (lines 1-18):
```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { TransactionTable } from "@/components/transaction-table";
import { format, subMonths } from "date-fns";

interface Transaction {
  id: string;
  amount: string;
  date: string;
  name: string;
  merchantName: string | null;
  categoryPrimary: string | null;
  categoryDetailed: string | null;
  pending: boolean;
  accountName: string | null;
  accountType: string | null;
}
```

**AFTER** (lines 1-6):
```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { TransactionTable } from "@/components/transaction-table";
import { format, subMonths } from "date-fns";
import type { Transaction } from "@/types";
```

Delete the local `Transaction` interface (lines 7-18 in original).

### Step 4: Update `src/components/category-chart.tsx`

**BEFORE** (lines 12-17):
```typescript
interface CategoryData {
  category: string;
  total: number;
  count: number;
}
```

**AFTER:** Replace with import:
```typescript
import type { CategoryData } from "@/types";
```

Add this import after the recharts import (line 10). Delete lines 12-17.

### Step 5: Update `src/app/dashboard/categories/page.tsx`

**BEFORE** (lines 7-12):
```typescript
interface CategoryData {
  category: string;
  total: number;
  count: number;
}
```

**AFTER:** Replace with import:
```typescript
import type { CategoryData } from "@/types";
```

Add after line 6. Delete lines 8-12 in original.

### Step 6: Update `src/components/merchant-chart.tsx`

**BEFORE** (lines 13-19):
```typescript
interface MerchantData {
  merchant: string;
  total: number;
  count: number;
  avgAmount: number;
  isRecurring: boolean;
}
```

**AFTER:** Replace with import:
```typescript
import type { MerchantData } from "@/types";
```

Add after line 11. Delete lines 13-19 in original.

### Step 7: Update `src/app/dashboard/merchants/page.tsx`

**BEFORE** (lines 7-13):
```typescript
interface MerchantData {
  merchant: string;
  total: number;
  count: number;
  avgAmount: number;
  isRecurring: boolean;
}
```

**AFTER:** Replace with import:
```typescript
import type { MerchantData } from "@/types";
```

Add after line 6. Delete lines 8-14 in original.

### Step 8: Remove duplicate `formatCurrency` from `src/lib/telegram.ts`

**BEFORE** (lines 35-40):
```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
```

**AFTER:** Delete lines 35-40 entirely. The file should end after `sendTelegramMessage`.

### Step 9: Update `src/lib/alerts.ts` import

**BEFORE** (line 4):
```typescript
import { sendTelegramMessage, formatCurrency } from "@/lib/telegram";
```

**AFTER** (lines 4-5):
```typescript
import { sendTelegramMessage } from "@/lib/telegram";
import { formatCurrency } from "@/lib/utils";
```

### Step 10: Create shared `DateRangeFilter` component

**NEW FILE:** `src/components/date-range-filter.tsx`

```typescript
"use client";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFilterProps) {
  return (
    <div className="bg-white p-4 rounded-xl border shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>
    </div>
  );
}
```

### Step 11: Update `src/app/dashboard/categories/page.tsx` to use `DateRangeFilter`

**BEFORE** (lines 56-82 -- the date filter JSX):
```tsx
      <div className="bg-white p-4 rounded-xl border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>
```

**AFTER:**
```tsx
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />
```

Add import at top:
```typescript
import { DateRangeFilter } from "@/components/date-range-filter";
```

### Step 12: Update `src/app/dashboard/merchants/page.tsx` to use `DateRangeFilter`

Same replacement as Step 11. Replace the identical date filter JSX block (lines 60-85) with:

```tsx
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />
```

Add import at top:
```typescript
import { DateRangeFilter } from "@/components/date-range-filter";
```

### Step 13: Fix PlaidLink render side-effect

**File:** `src/components/plaid-link.tsx`

**BEFORE** (lines 55-64):
```typescript
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => setLinkToken(null),
  });

  // Auto-open when link token is ready
  if (linkToken && ready) {
    open();
  }
```

**AFTER:**
```typescript
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => setLinkToken(null),
  });

  // Auto-open when link token is ready
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);
```

Also add `useEffect` to the import on line 3:
```typescript
// BEFORE:
import { useState, useCallback } from "react";
// AFTER:
import { useState, useCallback, useEffect } from "react";
```

### Step 14: Remove dead code from `src/app/api/profile/route.ts`

**BEFORE** (line 3):
```typescript
import { updateUserProfile, getUserHistory } from "@/lib/scd2";
```

**AFTER** (line 3):
```typescript
import { updateUserProfile } from "@/lib/scd2";
```

**BEFORE** (lines 58-61):
```typescript
export async function GET_HISTORY() {
  // Exposed at /api/profile/history
  return null;
}
```

**AFTER:** Delete lines 58-61 entirely. The file should end after the `PUT` handler's closing brace on line 56.

---

## Verification Checklist

### Compilation
- [ ] `npx tsc --noEmit` -- zero type errors
- [ ] `npm run build` -- build succeeds
- [ ] No circular import warnings

### Functional
- [ ] Dashboard page loads and shows charts
- [ ] Transactions page loads, filters work, pagination works
- [ ] Categories page loads with date filters working
- [ ] Merchants page loads with date filters working
- [ ] PlaidLink button still opens the Plaid modal (test in dev with sandbox)
- [ ] `PUT /api/profile` still works
- [ ] `GET /api/profile/history` still works (uses separate route file)
- [ ] Telegram daily alert messages still format currency correctly
- [ ] Telegram anomaly alerts still format currency correctly

### Import Verification
- [ ] `grep -r "formatCurrency" src/` shows NO imports from `@/lib/telegram`
- [ ] `grep -r "interface Transaction" src/` shows only `src/types/index.ts`
- [ ] `grep -r "interface CategoryData" src/` shows only `src/types/index.ts`
- [ ] `grep -r "interface MerchantData" src/` shows only `src/types/index.ts`
- [ ] `grep -r "GET_HISTORY" src/` shows zero results

---

## What NOT To Do

1. **Do NOT change the `Transaction` interface shape.** Only move it. The fields must remain identical.

2. **Do NOT rename the import paths for components.** Keep `@/components/transaction-table`, etc.

3. **Do NOT remove `formatCurrency` from `src/lib/utils.ts`.** That is the canonical location. Only remove it from `telegram.ts`.

4. **Do NOT modify `src/app/api/profile/history/route.ts`.** It correctly imports `getUserHistory` from `scd2.ts` and is the proper route handler.

5. **Do NOT extract the transaction filter inputs (category, merchant) into `DateRangeFilter`.** Keep it focused on dates only. The transactions page has additional filters that are unique to it.

6. **Do NOT add `useEffect` cleanup/return in the PlaidLink fix.** The `open()` call is a one-time trigger, not a subscription.

7. **Do NOT create a barrel export from `src/types/`.** A single `index.ts` with all shared types is sufficient.
