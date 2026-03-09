"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { format } from "date-fns";

interface Account {
  id: string;
  name: string;
  type: string;
}

interface AddTransactionModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export function AddTransactionModal({ onClose, onSaved }: AddTransactionModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [description, setDescription] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [categoryPrimary, setCategoryPrimary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        const accts = data.accounts || [];
        setAccounts(accts);
        if (accts.length === 1) setAccountId(accts[0].id);
      });
  }, []);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-background-elevated border border-border rounded-2xl p-6 w-full max-w-md mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Add Transaction</h2>
          <button
            onClick={onClose}
            className="text-foreground-tertiary hover:text-foreground p-1 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/20 text-danger text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Expense / Income toggle */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setIsExpense(true)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                isExpense
                  ? "bg-accent text-foreground"
                  : "bg-background text-foreground-muted hover:bg-white/5"
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
                  : "bg-background text-foreground-muted hover:bg-white/5"
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

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-border rounded-xl text-foreground-muted hover:bg-white/5 transition-all duration-150 active:scale-95 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !description.trim() || !amount}
            className="flex-1 px-4 py-2.5 bg-accent text-foreground rounded-xl font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
          >
            {saving ? "Adding..." : "Add Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}
