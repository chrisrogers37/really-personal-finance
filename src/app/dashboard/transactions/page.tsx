"use client";

import { useEffect, useState, useCallback } from "react";
import { TransactionTable } from "@/components/transaction-table";
import { EditTransactionModal } from "@/components/edit-transaction-modal";
import { AddTransactionModal } from "@/components/add-transaction-modal";
import { format, subMonths } from "date-fns";
import { DATE_PRESETS, getPresetDates } from "@/lib/date-presets";
import { formatCategory } from "@/lib/utils";
import { Plus } from "lucide-react";
import type { Transaction } from "@/types";

interface Account {
  id: string;
  name: string;
  type: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (category) params.set("category", category);
    if (merchant) params.set("merchant", merchant);
    params.set("limit", String(limit));
    params.set("offset", String(offset));

    try {
      const response = await fetch(`/api/transactions?${params}`);
      const json = await response.json();
      setTransactions(json.transactions || []);
    } catch {
      console.error("Failed to fetch transactions");
    }
    setLoading(false);
  }, [startDate, endDate, category, merchant, offset]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(data.accounts || []))
      .catch(() => {});

    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-foreground-muted">
            Browse and filter your transactions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-foreground rounded-xl font-medium hover:bg-accent-hover transition-all duration-150 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Transaction</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-background-card backdrop-blur-xl p-4 rounded-2xl border border-border space-y-3">
        {/* Date presets */}
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((preset) => {
            const { start, end } = getPresetDates(preset);
            const isActive = startDate === start && endDate === end;
            return (
              <button
                key={preset.label}
                onClick={() => {
                  setStartDate(start);
                  setEndDate(end);
                  setOffset(0);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 active:scale-95 ${
                  isActive
                    ? "bg-accent text-foreground"
                    : "border border-border text-foreground-muted hover:bg-white/5"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {formatCategory(cat)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1">
              Merchant
            </label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => {
                setMerchant(e.target.value);
                setOffset(0);
              }}
              placeholder="Search merchants..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground placeholder:text-foreground-tertiary"
            />
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-border p-4 animate-fade-in">
        <TransactionTable
          transactions={transactions}
          loading={loading}
          onEditTransaction={setEditingTransaction}
        />

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-4 py-2 text-sm font-medium text-foreground-muted border border-border rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
          >
            Previous
          </button>
          <span className="text-sm text-foreground-tertiary">
            Showing {offset + 1}–{offset + transactions.length}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={transactions.length < limit}
            className="px-4 py-2 text-sm font-medium text-foreground-muted border border-border rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
          >
            Next
          </button>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSaved={() => {
            setEditingTransaction(null);
            fetchTransactions();
          }}
        />
      )}

      {/* Add Transaction Modal */}
      {showAddModal && (
        <AddTransactionModal
          accounts={accounts}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            fetchTransactions();
          }}
        />
      )}
    </div>
  );
}
