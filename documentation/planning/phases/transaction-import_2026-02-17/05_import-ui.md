# Phase 05: Import UI

**PR Title:** feat: add drag-and-drop transaction import UI with preview
**Risk:** Low | **Effort:** Medium | **Status:** ✅ COMPLETE
**Started:** 2026-02-17 | **Completed:** 2026-02-17

### Challenge Round Decisions
1. **Bug fix:** `useState(() => { fetch(...) })` → `useEffect(() => { ... }, [])` for account fetching on mount
2. **Bug fix:** Removed `plaid_match` from `Duplicate.reason` — only `exact_import_id` and `same_date_amount` exist in the API
3. **Style fix:** Heading color `text-indigo-400` → `text-gray-900` to match all other dashboard pages
4. **Confirmed:** Amount sign convention matches existing `TransactionTable` (negative = inflow)

## Context

The user-facing import experience. Drag-and-drop file upload, format auto-detection feedback, account selection (or inline creation), transaction preview table with duplicate highlighting, and confirm/import button.

## Dependencies

- **Blocks:** Nothing
- **Blocked by:** Phase 04 (import API)

## Files Created

- `src/app/dashboard/import/page.tsx` — main import page
- `src/components/file-dropzone.tsx` — drag-and-drop file input
- `src/components/import-preview.tsx` — preview table with dedup indicators

## Files Modified

- `src/app/dashboard/layout.tsx` — already has "Import" link from Phase 03

## Detailed Implementation

### 1. File Dropzone component (`src/components/file-dropzone.tsx`)

A drag-and-drop area that accepts CSV, QFX, QBO, and OFX files.

```typescript
"use client";

import { useState, useCallback } from "react";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  loading?: boolean;
  acceptedFormats?: string; // e.g., ".csv,.qfx,.qbo,.ofx"
}

export function FileDropzone({
  onFileSelect,
  loading = false,
  acceptedFormats = ".csv,.qfx,.qbo,.ofx",
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
        transition-colors duration-200
        ${dragActive
          ? "border-indigo-400 bg-indigo-50"
          : "border-gray-300 bg-white hover:border-gray-400"
        }
        ${loading ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      <input
        type="file"
        accept={acceptedFormats}
        onChange={handleChange}
        className="hidden"
        id="file-upload"
        disabled={loading}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <p className="text-lg font-medium text-gray-700">
          {loading ? "Parsing file..." : "Drop a bank export file here"}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          or click to browse. Supports CSV, QFX, QBO, OFX
        </p>
      </label>
    </div>
  );
}
```

### 2. Import Preview component (`src/components/import-preview.tsx`)

Shows parsed transactions in a table with duplicate indicators and checkboxes.

Key features:
- Table columns: checkbox, Date, Description, Amount, Status (New / Duplicate / Possible Duplicate)
- Duplicates shown with yellow/red background and reason text
- "Select All New" / "Deselect All" buttons
- Exact duplicates (`exact_import_id`) unchecked by default
- Possible duplicates (`same_date_amount`, `plaid_match`) checked but highlighted for review
- New transactions checked by default
- Shows count summary: "41 transactions: 38 new, 3 duplicates"

```typescript
"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PreviewTransaction {
  date: string;
  description: string;
  amount: string;
  merchantName?: string;
  importId: string;
  isDuplicate: boolean;
  memo?: string;
}

interface Duplicate {
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

interface ImportPreviewProps {
  transactions: PreviewTransaction[];
  duplicates: Duplicate[];
  format: string;
  onConfirm: (selectedIndexes: number[]) => void;
  loading?: boolean;
}

export function ImportPreview({
  transactions,
  duplicates,
  format,
  onConfirm,
  loading = false,
}: ImportPreviewProps) {
  // Build duplicate lookup
  const dupMap = new Map<number, Duplicate>();
  for (const dup of duplicates) {
    dupMap.set(dup.importIndex, dup);
  }

  // Initialize selection: check all non-exact-duplicates
  const [selected, setSelected] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    transactions.forEach((_, i) => {
      const dup = dupMap.get(i);
      if (!dup || dup.reason !== "exact_import_id") {
        initial.add(i);
      }
    });
    return initial;
  });

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(transactions.map((_, i) => i)));
    } else {
      setSelected(new Set());
    }
  };

  const toggle = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const newCount = transactions.filter((_, i) => !dupMap.has(i)).length;
  const dupCount = dupMap.size;

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      {/* Summary bar */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-600">
            Detected format: <span className="font-medium">{format}</span>
          </p>
          <p className="text-sm text-gray-600">
            {transactions.length} transactions: {newCount} new, {dupCount} duplicates
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Select all
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => toggleAll(false)}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Deselect all
          </button>
        </div>
      </div>

      {/* Transaction table */}
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="p-2 w-8"></th>
              <th className="p-2">Date</th>
              <th className="p-2">Description</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn, i) => {
              const dup = dupMap.get(i);
              const amount = parseFloat(txn.amount);
              const isInflow = amount < 0;

              return (
                <tr
                  key={i}
                  className={
                    dup?.reason === "exact_import_id"
                      ? "bg-red-50"
                      : dup
                      ? "bg-yellow-50"
                      : ""
                  }
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                    />
                  </td>
                  <td className="p-2 whitespace-nowrap">{formatDate(txn.date)}</td>
                  <td className="p-2 truncate max-w-xs">{txn.description}</td>
                  <td className={`p-2 text-right whitespace-nowrap ${isInflow ? "text-green-600" : ""}`}>
                    {isInflow ? "+" : "-"}{formatCurrency(Math.abs(amount))}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {!dup && <span className="text-green-600 text-xs font-medium">New</span>}
                    {dup?.reason === "exact_import_id" && (
                      <span className="text-red-600 text-xs font-medium">Already imported</span>
                    )}
                    {dup?.reason === "same_date_amount" && (
                      <span className="text-yellow-600 text-xs font-medium">Possible duplicate</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onConfirm(Array.from(selected))}
          disabled={selected.size === 0 || loading}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg
                     hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Importing..."
            : `Import ${selected.size} transaction${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
```

### 3. Import page (`src/app/dashboard/import/page.tsx`)

The main page that ties everything together.

**Flow:**
1. Show file dropzone
2. On file select → POST to `/api/import/preview` → show preview table
3. Show account selector dropdown (existing accounts + "Create new" option)
4. If "Create new" selected, show inline form (name, type) → POST to `/api/accounts`
5. On confirm → POST to `/api/import/confirm` with selected transactions + account ID
6. Show success message with count

```typescript
"use client";

import { useState, useCallback, useEffect } from "react";
import { FileDropzone } from "@/components/file-dropzone";
import { ImportPreview } from "@/components/import-preview";

// Page state machine: idle → parsing → preview → importing → done
type ImportState = "idle" | "parsing" | "preview" | "importing" | "done";

export default function ImportPage() {
  const [state, setState] = useState<ImportState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [importedCount, setImportedCount] = useState(0);

  // New account inline form
  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("credit");

  // Fetch accounts on mount
  useEffect(() => {
    fetch("/api/accounts")
      .then(r => r.json())
      .then(data => setAccounts(data.accounts || []));
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    setState("parsing");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to parse file");
        setState("idle");
        return;
      }

      setPreviewData(data);
      setState("preview");
    } catch {
      setError("Failed to upload file");
      setState("idle");
    }
  }, []);

  const handleCreateAccount = useCallback(async () => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newAccountName,
        type: newAccountType,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setAccounts(prev => [...prev, data.account]);
      setSelectedAccountId(data.account.id);
      setShowNewAccount(false);
      setNewAccountName("");
    }
  }, [newAccountName, newAccountType]);

  const handleConfirm = useCallback(async (selectedIndexes: number[]) => {
    if (!selectedAccountId) {
      setError("Please select an account");
      return;
    }

    setState("importing");
    const txns = selectedIndexes.map(i => previewData.transactions[i]);

    try {
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          transactions: txns,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setImportedCount(data.imported);
        setState("done");
      } else {
        setError(data.error || "Import failed");
        setState("preview");
      }
    } catch {
      setError("Import failed");
      setState("preview");
    }
  }, [selectedAccountId, previewData]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Transactions</h1>
      <p className="text-gray-600 mb-6">
        Upload a bank export file (CSV, QFX, QBO, OFX) to import transactions.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Step 1: File upload */}
      {(state === "idle" || state === "parsing") && (
        <FileDropzone
          onFileSelect={handleFileSelect}
          loading={state === "parsing"}
        />
      )}

      {/* Step 2: Account selection */}
      {state === "preview" && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Import to account:
          </label>
          <div className="flex gap-2">
            <select
              value={selectedAccountId}
              onChange={e => {
                if (e.target.value === "new") {
                  setShowNewAccount(true);
                  setSelectedAccountId("");
                } else {
                  setShowNewAccount(false);
                  setSelectedAccountId(e.target.value);
                }
              }}
              className="flex-1 p-2 border rounded-lg"
            >
              <option value="">Select account...</option>
              {accounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type}){a.source === "plaid" ? " - Plaid" : ""}
                </option>
              ))}
              <option value="new">+ Create new account</option>
            </select>
          </div>

          {showNewAccount && (
            <div className="mt-2 p-3 border rounded-lg bg-gray-50 flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500">Name</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  placeholder="e.g., Amex Platinum"
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Type</label>
                <select
                  value={newAccountType}
                  onChange={e => setNewAccountType(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="credit">Credit Card</option>
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <button
                onClick={handleCreateAccount}
                disabled={!newAccountName.trim()}
                className="px-4 py-2 bg-gray-800 text-white rounded
                           disabled:opacity-50"
              >
                Create
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview table */}
      {(state === "preview" || state === "importing") && previewData && (
        <ImportPreview
          transactions={previewData.transactions}
          duplicates={previewData.duplicates}
          format={previewData.format}
          onConfirm={handleConfirm}
          loading={state === "importing"}
        />
      )}

      {/* Step 4: Success */}
      {state === "done" && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl text-center">
          <p className="text-lg font-medium text-green-800">
            Successfully imported {importedCount} transactions
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={() => {
                setState("idle");
                setPreviewData(null);
                setError(null);
              }}
              className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
            >
              Import more
            </button>
            <a
              href="/dashboard/transactions"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              View transactions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Test Plan

1. **Manual E2E test — full flow:**
   - Navigate to `/dashboard/import`
   - Drop `test_data/american_express/activity.csv` → preview shows 41 transactions
   - Create new account "Amex Platinum" (credit)
   - Click "Import 41 transactions" → success
   - Navigate to Transactions page → verify imported transactions appear with "Import" source
   - Drop same file again → preview shows all 41 as "Already imported"

2. **Manual test — BofA:**
   - Drop `test_data/bank_of_america/stmt.csv`
   - Verify summary rows skipped, ~15 transactions shown
   - Create "BofA Savings" account
   - Import → success

3. **Manual test — OFX:**
   - Drop `test_data/american_express/activity.qfx`
   - Verify same transactions as CSV but with FITID-based dedup
   - Import to same Amex account → should show duplicates against CSV-imported ones

4. **Edge cases:**
   - Drop an unsupported file type (.pdf) → error message
   - Drop empty file → error message
   - No account selected → error message
   - Drop very large file (>5MB) → error message

## Verification Checklist

- [ ] Drag-and-drop works in Chrome
- [ ] Click-to-browse works as fallback
- [ ] Preview table scrolls for large files
- [ ] Duplicates highlighted in yellow/red
- [ ] Exact duplicates unchecked by default
- [ ] Account selector includes both Plaid and manual accounts
- [ ] Inline account creation works
- [ ] Success state shows count and links
- [ ] "Import more" resets the flow
- [ ] Imported transactions visible in dashboard with source badge

## What NOT To Do

- Don't add drag-and-drop to other pages — keep it contained to the import page
- Don't auto-select an account based on `accountHint` from OFX — let the user choose
- Don't add progress bars for small files — the import is fast enough without them
- Don't store import history/batches — keep it simple, transactions are the source of truth
- Don't add undo/rollback — import is additive, user can delete from the database if needed
