"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
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
    <Modal
      title="Edit Transaction"
      onClose={onClose}
      error={error}
      footer={
        <>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-border rounded-xl text-foreground-muted hover:bg-black/[0.04] transition-all duration-150 active:scale-95 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      }
    >
      <div className="text-sm text-foreground-muted mb-4">
        <span className="font-medium text-foreground">{transaction.name}</span>
        <span className="mx-2">&middot;</span>
        <span>{transaction.date}</span>
      </div>

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
    </Modal>
  );
}
