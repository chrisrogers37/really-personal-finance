# Implementation Plan: Transaction Management Features

## Feature 1: Transaction Editing (smallest scope — do first)

### New Files
- `src/components/edit-transaction-modal.tsx` — Modal for editing merchant name and category
- `src/app/api/transactions/[id]/route.ts` — PATCH endpoint for updating a transaction

### Modified Files
- `src/components/transaction-table.tsx` — Add click-to-edit affordance on category/merchant cells, pencil icon on hover
- `src/app/dashboard/transactions/page.tsx` — Wire up edit modal state, refresh table after save

### API: `PATCH /api/transactions/[id]`
- Auth check, verify transaction belongs to user
- Accept `{ merchantName?, categoryPrimary? }` in body
- Update only provided fields via Drizzle `set()`
- Return updated transaction

### Edit Modal UX
- Opens when clicking a category pill or merchant name in the transaction table
- Pre-fills current values
- Two text inputs: Merchant Name, Category
- Save calls PATCH, closes modal, parent refreshes

---

## Feature 2: Add Transaction Form

### New Files
- `src/components/add-transaction-modal.tsx` — Modal with form: date, amount, description, merchant, category, account

### Modified Files
- `src/app/api/transactions/route.ts` — Add POST handler alongside existing GET
- `src/app/dashboard/transactions/page.tsx` — Add "+" button in header, open modal, refresh on success

### API: `POST /api/transactions`
- Auth check
- Required: `accountId`, `date`, `amount`, `description`
- Optional: `merchantName`, `categoryPrimary`
- Verify account belongs to user
- Generate `importId` as `manual:<random-uuid>` (satisfies unique constraint)
- Insert with `source: "manual"`
- Return created transaction

### Add Transaction Modal UX
- Date input (defaults to today)
- Amount input (number) with expense/income toggle (handles Plaid positive=outflow convention)
- Description (text, required)
- Merchant name (text, optional)
- Category (text, optional)
- Account dropdown (fetched from `/api/accounts`)

---

## Feature 3: Drag-and-Drop Column Mapping for CSV Import (largest scope — do last)

### New Files
- `src/components/column-mapper.tsx` — Interactive drag-and-drop mapping UI
- `src/app/api/column-mappings/route.ts` — CRUD for saved mappings
- `src/lib/parsers/mapped-csv.ts` — Parser that applies user-defined column mapping to any CSV

### Modified Files
- `src/db/schema.ts` — Add `columnMappings` table
- `src/app/dashboard/import/page.tsx` — Insert column mapper step between upload and preview
- `src/app/api/import/preview/route.ts` — Accept optional `mapping` JSON to bypass auto-detection
- `src/lib/parsers/types.ts` — Add `ColumnMapping` type definition
- `src/lib/parsers/index.ts` — Wire in mapped CSV parsing path

### New DB Table: `column_mappings`
```
id              uuid PK default random
user_id         uuid NOT NULL
name            text NOT NULL            -- "Chase Checking", "Capital One Visa"
columns         jsonb NOT NULL           -- { date: "Post Date", amount: "Amount", description: "Description", ... }
date_format     text                     -- "MM/DD/YYYY" | "YYYY-MM-DD" | "DD/MM/YYYY"
amount_convention text NOT NULL          -- "positive_outflow" | "negative_outflow"
skip_rows       integer default 0        -- summary rows before real header
created_at      timestamp default now()
INDEX idx_column_mappings_user_id ON (user_id)
```

### Column Mapper Component Layout

**Three zones:**

1. **Target columns** (left) — Drop targets for required/optional fields:
   - Date (required)
   - Amount (required)
   - Description (required)
   - Merchant Name (optional)
   - Category (optional)
   - Memo/Notes (optional)

2. **Source columns** (right) — Draggable chips showing CSV header names, each with a preview of the first value from that column

3. **Data preview** (bottom) — Live table showing how the first 5 rows parse with the current mapping

**Interaction model:**
- Drag source column → drop on target slot
- Click X on a mapped target to unmap
- HTML5 Drag and Drop API (no external dependencies)
- "Continue" enables once date + amount + description are mapped

**Settings panel (below the mapper):**
- Date format: auto-detect or explicit (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- Amount convention: "Positive = expense" vs "Negative = expense" with a live preview
- Skip rows: number input for CSVs with summary headers above the real header

**Saved mappings:**
- "Save this format" checkbox + name field after mapping
- On next upload, auto-match saved mapping by comparing CSV headers → auto-apply if match found
- Saved mappings manageable via API (list, save, delete)

### Reworked Import Flow

**Current:** Upload → Auto-detect → Preview → Confirm

**New:**
```
Upload → Parse CSV headers
  ├─ OFX/QFX/QBO file? → Existing OFX parser → Preview → Confirm
  ├─ Known format (Amex/BofA detected)? → Existing parser → Preview → Confirm
  ├─ Saved mapping matches headers? → Auto-apply mapping → Preview (with "Edit mapping" link) → Confirm
  └─ Unknown CSV? → Column Mapper UI → User maps columns → Optionally save → Preview → Confirm
```

---

## Implementation Order

1. **Transaction Editing** — 2 new files, 2 modified files, immediately useful
2. **Add Transaction** — 1 new file, 2 modified files, builds on transactions API
3. **Column Mapping** — 3 new files, 5 modified files, schema migration, largest scope
