# Phase 02: File Parsers

**PR Title:** feat: add CSV and OFX/QFX transaction file parsers
**Risk:** Low | **Effort:** Medium | **Status:** ✅ COMPLETE
**Started:** 2026-02-17 | **Completed:** 2026-02-17

## Context

Parse bank export files into a normalized transaction format. Three parsers needed based on real export samples from American Express and Bank of America. Format auto-detection by file extension and content sniffing.

## Dependencies

- **Blocks:** Phase 04 (import API)
- **Blocked by:** Nothing (can run in parallel with Phase 01)

## Files Created

- `src/lib/parsers/types.ts` — shared parser types
- `src/lib/parsers/csv.ts` — CSV parser (Amex + BofA formats)
- `src/lib/parsers/ofx.ts` — OFX/QFX/QBO parser
- `src/lib/parsers/index.ts` — auto-detection + unified entry point
- `src/__tests__/parsers.test.ts` — unit tests

## New Dependency

```bash
npm install papaparse
npm install -D @types/papaparse
```

PapaParse handles CSV edge cases (quoted fields with commas, newlines in values). The BofA CSV has quoted descriptions with commas (e.g., `"VF OUTDOOR, LLC     DENVER              CO"`).

No OFX library needed — the XML is simple enough to parse with regex/string splitting. The Amex OFX files use single-line XML, not deeply nested. A lightweight custom parser is more reliable than a full OFX library dependency.

## Detailed Implementation

### 1. Parser types (`src/lib/parsers/types.ts`)

```typescript
export interface ParsedTransaction {
  date: string;           // YYYY-MM-DD (normalized)
  description: string;    // Raw merchant/description text
  amount: string;         // Decimal string, Plaid convention: positive = outflow, negative = inflow
  merchantName?: string;  // Cleaned merchant name if available
  externalId?: string;    // Bank-provided transaction ID (FITID from OFX)
  memo?: string;          // Additional detail (OFX MEMO field)
  type?: string;          // DEBIT/CREDIT from OFX
}

export interface ParseResult {
  format: "amex-csv" | "bofa-csv" | "ofx";
  accountHint?: string;   // Account identifier from file (OFX ACCTID)
  transactions: ParsedTransaction[];
  skippedRows?: number;   // Header/summary rows skipped
  errors: string[];       // Non-fatal parse warnings
}
```

**Amount sign convention:** Normalize to Plaid convention (positive = money out/charge, negative = money in/credit). This matters because:
- Amex CSV: positive = charge (same as Plaid) — no conversion needed
- Amex OFX: negative = charge — negate the sign
- BofA CSV: negative = debit/outflow — negate the sign

### 2. CSV parser (`src/lib/parsers/csv.ts`)

```typescript
import Papa from "papaparse";
import type { ParsedTransaction, ParseResult } from "./types";

/**
 * Detect CSV format from headers.
 * - Amex: "Date,Description,Amount" (3 columns)
 * - BofA: "Date,Description,Amount,Running Bal." (4 columns, after summary header)
 */
export function parseCSV(content: string, filename?: string): ParseResult {
  // ... implementation below
}
```

#### Amex CSV parsing logic:

1. Parse with PapaParse (`header: true`)
2. Detect by checking first row headers: `Date`, `Description`, `Amount` (exactly 3)
3. For each row:
   - Date: parse `MM/DD/YYYY` → `YYYY-MM-DD`
   - Description: trim whitespace, use as-is
   - Amount: parse float, keep sign (positive = charge = outflow, matches Plaid)
4. Return `format: "amex-csv"`

#### BofA CSV parsing logic:

1. Split content by newlines, find the row starting with `Date,Description,Amount,Running Bal.`
2. Everything before that row is the summary header — skip it
3. Parse remaining content with PapaParse (`header: true`)
4. Skip the first data row if description contains "Beginning balance"
5. For each row:
   - Date: parse `MM/DD/YYYY` → `YYYY-MM-DD`
   - Description: trim quotes and whitespace
   - Amount: parse float (strip commas), **negate the sign** (BofA: negative=outflow → Plaid: positive=outflow)
6. Return `format: "bofa-csv"`

#### Format auto-detection within CSV:

```typescript
function detectCSVFormat(headers: string[]): "amex-csv" | "bofa-csv" | null {
  const normalized = headers.map(h => h.trim().toLowerCase());
  if (normalized.includes("running bal.")) return "bofa-csv";
  if (normalized.length === 3 && normalized[0] === "date") return "amex-csv";
  return null; // Unknown format
}
```

### 3. OFX parser (`src/lib/parsers/ofx.ts`)

```typescript
import type { ParsedTransaction, ParseResult } from "./types";

/**
 * Parse OFX/QFX/QBO files. Works for both Amex QFX and QBO exports.
 * Uses regex extraction — no XML parser needed since OFX is flat.
 */
export function parseOFX(content: string): ParseResult {
  // ... implementation below
}
```

#### OFX parsing logic:

1. Extract account ID: regex for `<ACCTID>([^<]+)</ACCTID>`
2. Extract all `<STMTTRN>...</STMTTRN>` blocks
3. For each block, extract:
   - `<DTPOSTED>` → take first 8 chars (`YYYYMMDD`), convert to `YYYY-MM-DD`
   - `<TRNAMT>` → parse float, **negate the sign** (OFX: negative=charge → Plaid: positive=charge)
   - `<FITID>` → use as `externalId` (critical for dedup)
   - `<NAME>` → use as `description`
   - `<MEMO>` → use as `memo`
   - `<TRNTYPE>` → use as `type`
4. Return `format: "ofx"`, include `accountHint` from ACCTID

#### Key regex patterns:

```typescript
const STMTTRN_REGEX = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
const TAG_REGEX = (tag: string) => new RegExp(`<${tag}>([^<]*)</${tag}>`);
// For SGML-style OFX (no closing tags): <TAG>value\n
const SGML_TAG_REGEX = (tag: string) => new RegExp(`<${tag}>([^\\n<]+)`);
```

Note: Some OFX files use SGML (no closing tags), others use XML. Test both patterns and use whichever matches.

### 4. Auto-detection entry point (`src/lib/parsers/index.ts`)

```typescript
import { parseCSV } from "./csv";
import { parseOFX } from "./ofx";
import type { ParseResult } from "./types";

export type { ParsedTransaction, ParseResult } from "./types";

/**
 * Auto-detect file format and parse transactions.
 * Detection priority:
 * 1. File extension (.qfx, .qbo, .ofx → OFX parser)
 * 2. Content sniffing (starts with "<?xml" or "<OFX" → OFX parser)
 * 3. Default to CSV parser
 */
export function parseTransactionFile(
  content: string,
  filename: string
): ParseResult {
  const ext = filename.toLowerCase().split(".").pop();

  // OFX-family by extension
  if (ext === "qfx" || ext === "qbo" || ext === "ofx") {
    return parseOFX(content);
  }

  // OFX-family by content sniffing
  if (content.trimStart().startsWith("<?xml") || content.includes("<OFX>")) {
    return parseOFX(content);
  }

  // CSV
  return parseCSV(content, filename);
}
```

### 5. Date parsing utility

Add to parsers — shared by CSV and OFX:

```typescript
/** MM/DD/YYYY → YYYY-MM-DD */
export function parseMMDDYYYY(date: string): string {
  const [month, day, year] = date.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** YYYYMMDD... → YYYY-MM-DD (OFX date format, may have timezone suffix) */
export function parseOFXDate(date: string): string {
  const clean = date.substring(0, 8); // Take first 8 chars
  return `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}`;
}
```

## Test Plan (`src/__tests__/parsers.test.ts`)

Use the real test data files in `test_data/` for integration tests:

1. **Amex CSV:** Parse `test_data/american_express/activity.csv`
   - Verify 40 transactions parsed
   - Verify date conversion: `02/14/2026` → `2026-02-14`
   - Verify charge amount stays positive: `35.00` → `"35.00"`
   - Verify credit amount stays negative: `-14.10` → `"-14.10"`
   - Verify format detected as `"amex-csv"`

2. **Amex QFX:** Parse `test_data/american_express/activity.qfx`
   - Verify same transaction count as CSV (40)
   - Verify FITID extracted: first transaction → `"320260450232984846"`
   - Verify amount sign negated: `<TRNAMT>-35.00` → `"35.00"` (charge = positive)
   - Verify date: `20260214000000.000[-7:MST]` → `"2026-02-14"`
   - Verify `accountHint` extracted from `<ACCTID>`

3. **Amex QBO:** Parse `test_data/american_express/activity.qbo`
   - Verify identical output to QFX (same data, same format)

4. **BofA CSV:** Parse `test_data/bank_of_america/stmt.csv`
   - Verify summary header skipped (5 rows)
   - Verify "Beginning balance" row skipped
   - Verify 16 real transactions parsed (excluding beginning balance)
   - Verify amount sign negated: `-50.00` → `"50.00"` (debit = positive outflow)
   - Verify credit amount negated: `3,247.50` → `"-3247.50"` (credit = negative inflow)
   - Verify comma-thousands parsing: `"3,247.50"` → `3247.50`
   - Verify format detected as `"bofa-csv"`

5. **Auto-detection:** Verify `parseTransactionFile()` routes correctly by extension and content

6. **Edge cases:**
   - Empty file → returns `{ transactions: [], errors: ["Empty file"] }`
   - Unknown CSV format (wrong headers) → returns error
   - Malformed OFX (truncated) → returns partial results + error

## Verification Checklist

- [ ] `npm test -- --grep parsers` passes all tests
- [ ] All 4 test data files parse without errors
- [ ] Amount signs match Plaid convention across all formats
- [ ] Dates are YYYY-MM-DD across all formats

## What NOT To Do

- Don't install a full OFX library (like `ofx-js`) — the format is simple enough for regex and adding a dependency for it is overkill given the flat structure of these files
- Don't try to parse the `.txt` file from BofA — it's fixed-width and unreliable. CSV is the supported format
- Don't try to parse `.xlsx` — would need a heavy dependency. Users can export CSV from the same place
- Don't add category inference/mapping in this phase — that's a separate enhancement if needed later
- Don't normalize merchant names in the parser — that's the display layer's job
