"use client";

import { useEffect, useState, useCallback } from "react";
import { TransactionTable } from "@/components/transaction-table";
import { format, subMonths } from "date-fns";
import type { Transaction } from "@/types";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [category, setCategory] = useState("");
  const [merchant, setMerchant] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transactions</h1>
        <p className="text-foreground-muted">Browse and filter your transactions</p>
      </div>

      {/* Filters */}
      <div className="bg-background-card p-4 rounded-xl border border-border">
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
            <input
              type="text"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setOffset(0);
              }}
              placeholder="e.g., FOOD_AND_DRINK"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground placeholder:text-foreground-tertiary"
            />
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
      <div className="bg-background-card rounded-xl border border-border p-4">
        <TransactionTable transactions={transactions} loading={loading} />

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-4 py-2 text-sm font-medium text-foreground-muted border border-border rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-foreground-tertiary">
            Showing {offset + 1}–{offset + transactions.length}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={transactions.length < limit}
            className="px-4 py-2 text-sm font-medium text-foreground-muted border border-border rounded-lg hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
