"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Transaction } from "@/types";

interface EditTransactionModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSaved: () => void;
}

export function EditTransactionModal({
  transaction,
  onClose,
  onSaved,
}: EditTransactionModalProps) {
  const [merchantName, setMerchantName] = useState(
    transaction.merchantName || ""
  );
  const [categoryPrimary, setCategoryPrimary] = useState(
    transaction.categoryPrimary || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantName, categoryPrimary }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save");
        setSaving(false);
        return;
      }

      onSaved();
    } catch {
      setError("Failed to save");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-background-elevated border border-border rounded-2xl p-6 w-full max-w-md mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Edit Transaction</h2>
          <button
            onClick={onClose}
            className="text-foreground-tertiary hover:text-foreground p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-sm text-foreground-muted mb-4">
          <span className="font-medium text-foreground">{transaction.name}</span>
          <span className="mx-2">&middot;</span>
          <span>{transaction.date}</span>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Merchant Name
            </label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="e.g., Starbucks"
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Category
            </label>
            <input
              type="text"
              value={categoryPrimary}
              onChange={(e) => setCategoryPrimary(e.target.value)}
              placeholder="e.g., FOOD_AND_DRINK"
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-border rounded-xl text-foreground-muted hover:bg-white/5 transition-all duration-150 active:scale-95 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
