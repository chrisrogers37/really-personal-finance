"use client";

import { useState, useCallback, useEffect } from "react";
import { FileDropzone } from "@/components/file-dropzone";
import { ImportPreview } from "@/components/import-preview";
import { ColumnMapper } from "@/components/column-mapper";
import type { ColumnMapping, SavedColumnMapping, MappingConfig } from "@/lib/parsers/types";

type ImportState =
  | "idle"
  | "parsing"
  | "mapping"
  | "processing"
  | "preview"
  | "importing"
  | "done";

interface Account {
  id: string;
  name: string;
  type: string;
  source: string;
}

interface CSVMeta {
  headers: string[];
  sampleRows: Record<string, string>[];
  fileContent: string;
  fileName: string;
}

export default function ImportPage() {
  const [state, setState] = useState<ImportState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [importedCount, setImportedCount] = useState(0);
  const [csvMeta, setCsvMeta] = useState<CSVMeta | null>(null);
  const [savedMappings, setSavedMappings] = useState<SavedColumnMapping[]>([]);
  const [matchedMapping, setMatchedMapping] = useState<SavedColumnMapping | null>(null);

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("credit");

  // Load accounts and saved mappings on mount
  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []));

    fetch("/api/column-mappings")
      .then((r) => r.json())
      .then((data) => setSavedMappings(data.mappings || []))
      .catch(() => {}); // ignore if table doesn't exist yet
  }, []);

  // Try to match saved mappings against CSV headers
  const findMatchingMapping = useCallback(
    (headers: string[]): SavedColumnMapping | null => {
      const headerSet = new Set(headers.map((h) => h.trim()));
      for (const mapping of savedMappings) {
        const cols = mapping.columns as ColumnMapping;
        // All mapped columns must be present in the CSV headers
        const requiredCols = [cols.date, cols.amount, cols.description].filter(Boolean);
        const optionalCols = [cols.merchantName, cols.category, cols.memo].filter(Boolean);
        const allCols = [...requiredCols, ...optionalCols];
        if (allCols.every((col) => headerSet.has(col!))) {
          return mapping;
        }
      }
      return null;
    },
    [savedMappings]
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      setState("parsing");
      setError(null);
      setMatchedMapping(null);

      // For non-CSV files, use the existing auto-detect flow
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "qfx" || ext === "qbo" || ext === "ofx") {
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
        return;
      }

      // For CSV files: read content, extract headers, check for saved mapping first
      try {
        const content = await file.text();

        // Parse headers client-side to check for a saved mapping before hitting the server
        const Papa = (await import("papaparse")).default;
        const parsed = Papa.parse<Record<string, string>>(content, {
          header: true,
          skipEmptyLines: true,
          preview: 5,
        });

        const headers = parsed.meta.fields;
        const sampleRows = parsed.data;

        if (!headers || headers.length === 0) {
          setError("Could not detect columns in CSV file");
          setState("idle");
          return;
        }

        // Check for a matching saved mapping — skip auto-detect entirely if found
        const match = findMatchingMapping(headers);
        if (match) {
          setCsvMeta({ headers, sampleRows, fileContent: content, fileName: file.name });
          setMatchedMapping(match);
          await applyMapping(content, file.name, {
            columns: match.columns as ColumnMapping,
            dateFormat: match.dateFormat,
            amountConvention: match.amountConvention,
            skipRows: match.skipRows,
          });
          return;
        }

        // No saved mapping — try server-side auto-detect (Amex, BofA, etc.)
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/import/preview", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (res.ok && data.format !== "unknown-csv") {
          setPreviewData(data);
          setState("preview");
          return;
        }

        // Unknown CSV — show column mapper
        setCsvMeta({ headers, sampleRows, fileContent: content, fileName: file.name });
        setState("mapping");
      } catch {
        setError("Failed to read file");
        setState("idle");
      }
    },
    [findMatchingMapping]
  );

  // Apply a column mapping and get the preview
  const applyMapping = useCallback(
    async (
      content: string,
      fileName: string,
      config: MappingConfig
    ) => {
      setState("processing");
      setError(null);

      try {
        const formData = new FormData();
        const blob = new Blob([content], { type: "text/csv" });
        formData.append("file", blob, fileName);
        formData.append("mapping", JSON.stringify({
          columns: config.columns,
          dateFormat: config.dateFormat,
          amountConvention: config.amountConvention,
          skipRows: config.skipRows,
        }));

        const res = await fetch("/api/import/preview", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to parse file with mapping");
          setState("mapping");
          return;
        }

        setPreviewData(data);
        setState("preview");

        // Save the mapping if requested
        if (config.saveName) {
          fetch("/api/column-mappings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: config.saveName,
              columns: config.columns,
              dateFormat: config.dateFormat,
              amountConvention: config.amountConvention,
              skipRows: config.skipRows,
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.mapping) {
                setSavedMappings((prev) => [...prev, data.mapping]);
              }
            })
            .catch(() => {}); // non-critical
        }
      } catch {
        setError("Failed to process file");
        setState("mapping");
      }
    },
    []
  );

  const handleMapperConfirm = useCallback(
    (config: MappingConfig) => {
      if (!csvMeta) return;
      applyMapping(csvMeta.fileContent, csvMeta.fileName, config);
    },
    [csvMeta, applyMapping]
  );

  const handleCreateAccount = useCallback(async () => {
    try {
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
        setAccounts((prev) => [...prev, data.account]);
        setSelectedAccountId(data.account.id);
        setShowNewAccount(false);
        setNewAccountName("");
      } else {
        setError(data.error || "Failed to create account");
      }
    } catch {
      setError("Failed to create account");
    }
  }, [newAccountName, newAccountType]);

  const handleConfirm = useCallback(
    async (selectedIndexes: number[]) => {
      if (!selectedAccountId) {
        setError("Please select an account");
        return;
      }

      setState("importing");
      setError(null);
      const txns = selectedIndexes.map((i) => previewData.transactions[i]);

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
    },
    [selectedAccountId, previewData]
  );

  const resetAll = useCallback(() => {
    setState("idle");
    setPreviewData(null);
    setCsvMeta(null);
    setMatchedMapping(null);
    setError(null);
  }, []);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Import Transactions
      </h1>
      <p className="text-foreground-muted mb-6">
        Upload a bank export file (CSV, QFX, QBO, OFX) to import transactions.
        Any CSV format works — you can map columns interactively.
      </p>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg mb-4 animate-fade-in">
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

      {/* Step 2: Column mapping (for unknown CSVs) */}
      {state === "mapping" && csvMeta && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground-muted">
              We couldn&apos;t auto-detect this CSV format. Map your columns below.
            </p>
            <button
              onClick={resetAll}
              className="text-sm text-foreground-tertiary hover:text-foreground transition-colors"
            >
              Start over
            </button>
          </div>
          <ColumnMapper
            headers={csvMeta.headers}
            sampleRows={csvMeta.sampleRows}
            onConfirm={handleMapperConfirm}
            initialMapping={matchedMapping?.columns as ColumnMapping | undefined}
          />
        </div>
      )}

      {/* Processing indicator */}
      {state === "processing" && (
        <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-border p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-xl shimmer-bg animate-shimmer mb-4" />
          <p className="text-foreground-muted">Processing with your column mapping...</p>
        </div>
      )}

      {/* Step 3: Account selection + Preview */}
      {(state === "preview" || state === "importing") && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground-muted">
              Import to account:
            </label>
            {previewData?.format === "mapped-csv" && (
              <button
                onClick={() => setState("mapping")}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Edit column mapping
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={selectedAccountId}
              onChange={(e) => {
                if (e.target.value === "new") {
                  setShowNewAccount(true);
                  setSelectedAccountId("");
                } else {
                  setShowNewAccount(false);
                  setSelectedAccountId(e.target.value);
                }
              }}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl bg-background-elevated text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150 appearance-none"
            >
              <option value="">Select account...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type}){a.source === "plaid" ? " - Plaid" : ""}
                </option>
              ))}
              <option value="new">+ Create new account</option>
            </select>
          </div>

          {showNewAccount && (
            <div className="mt-3 p-4 border border-border rounded-xl bg-background-elevated/50 backdrop-blur-xl flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-foreground-tertiary">Name</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="e.g., Amex Platinum"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-tertiary">Type</label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value)}
                  className="px-3 py-2 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
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
                className="px-4 py-2 bg-accent text-foreground rounded-xl hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-150 active:scale-95"
              >
                Create
              </button>
            </div>
          )}
        </div>
      )}

      {(state === "preview" || state === "importing") && previewData && (
        <ImportPreview
          transactions={previewData.transactions}
          duplicates={previewData.duplicates}
          format={previewData.format}
          onConfirm={handleConfirm}
          loading={state === "importing"}
        />
      )}

      {state === "done" && (
        <div className="bg-success/10 backdrop-blur-xl border border-success/20 p-6 rounded-2xl text-center animate-scale-in">
          <p className="text-lg font-medium text-success">
            Successfully imported {importedCount} transactions
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={resetAll}
              className="px-4 py-2 bg-background-elevated border border-border rounded-lg hover:bg-white/5 transition-all duration-150 active:scale-95"
            >
              Import more
            </button>
            <a
              href="/dashboard/transactions"
              className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-accent-hover transition-all duration-150 active:scale-95"
            >
              View transactions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
