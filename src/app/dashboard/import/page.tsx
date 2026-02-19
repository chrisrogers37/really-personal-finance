"use client";

import { useState, useCallback, useEffect } from "react";
import { FileDropzone } from "@/components/file-dropzone";
import { ImportPreview } from "@/components/import-preview";

type ImportState = "idle" | "parsing" | "preview" | "importing" | "done";

interface Account {
  id: string;
  name: string;
  type: string;
  source: string;
}

export default function ImportPage() {
  const [state, setState] = useState<ImportState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [importedCount, setImportedCount] = useState(0);

  const [showNewAccount, setShowNewAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("credit");

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []));
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

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Import Transactions
      </h1>
      <p className="text-foreground-muted mb-6">
        Upload a bank export file (CSV, QFX, QBO, OFX) to import transactions.
      </p>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {(state === "idle" || state === "parsing") && (
        <FileDropzone
          onFileSelect={handleFileSelect}
          loading={state === "parsing"}
        />
      )}

      {state === "preview" && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground-muted mb-1">
            Import to account:
          </label>
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
              className="flex-1 p-2 border border-border rounded-lg bg-background-elevated text-foreground"
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
            <div className="mt-2 p-3 border border-border rounded-lg bg-background-elevated flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs text-foreground-tertiary">Name</label>
                <input
                  type="text"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="e.g., Amex Platinum"
                  className="w-full p-2 border border-border rounded bg-background text-foreground placeholder:text-foreground-tertiary"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground-tertiary">Type</label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value)}
                  className="p-2 border border-border rounded bg-background-elevated text-foreground"
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
                className="px-4 py-2 bg-accent text-foreground rounded
                           disabled:opacity-50"
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
        <div className="bg-success/10 backdrop-blur-xl border border-success/20 p-6 rounded-2xl text-center">
          <p className="text-lg font-medium text-success">
            Successfully imported {importedCount} transactions
          </p>
          <div className="mt-4 flex gap-3 justify-center">
            <button
              onClick={() => {
                setState("idle");
                setPreviewData(null);
                setError(null);
              }}
              className="px-4 py-2 bg-background-elevated border border-border rounded-lg hover:bg-white/5"
            >
              Import more
            </button>
            <a
              href="/dashboard/transactions"
              className="px-4 py-2 bg-accent text-foreground rounded-lg hover:bg-accent-hover"
            >
              View transactions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
