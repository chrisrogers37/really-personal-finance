"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { format } from "date-fns";

interface Account {
  id: string;
  name: string;
  type: string;
}

interface AddTransactionModalProps {
  accounts: Account[];
  onClose: () => void;
  onSaved: () => void;
}

export function AddTransactionModal({ accounts, onClose, onSaved }: AddTransactionModalProps) {
  const [accountId, setAccountId] = useState(() =>
    accounts.length === 1 ? accounts[0].id : ""
  );
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [description, setDescription] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [categoryPrimary, setCategoryPrimary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!accountId) {
      setError("Please select an account");
      return;
    }

    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    setSaving(true);
    setError(null);

    // Plaid convention: positive = outflow (expense), negative = inflow (income)
    const finalAmount = isExpense ? numericAmount : -numericAmount;

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          date,
          amount: finalAmount,
          description,
          merchantName: merchantName || undefined,
          categoryPrimary: categoryPrimary || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add transaction");
        setSaving(false);
        return;
      }

      onSaved();
    } catch {
      setError("Failed to add transaction");
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add Transaction"
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
            disabled={saving || !description.trim() || !amount}
            className="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
          >
            {saving ? "Adding..." : "Add Transaction"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Expense / Income toggle */}
        <div className="flex rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setIsExpense(true)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              isExpense
                ? "bg-accent text-white"
                : "bg-background text-foreground-muted hover:bg-black/[0.04]"
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setIsExpense(false)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              !isExpense
                ? "bg-success text-foreground"
                : "bg-background text-foreground-muted hover:bg-black/[0.04]"
            }`}
          >
            Income
          </button>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1.5">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-foreground-muted mb-1.5">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
          />
        </div>

        {/* Date + Account row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150 appearance-none"
            >
              <option value="">Select...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Merchant + Category row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Merchant <span className="text-foreground-tertiary">(optional)</span>
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
              Category <span className="text-foreground-tertiary">(optional)</span>
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
      </div>
    </Modal>
  );
}
