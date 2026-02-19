"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
}

export function TransactionTable({
  transactions,
  loading,
}: TransactionTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-white/5 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-foreground-tertiary">
        No transactions found. Adjust your filters or connect a bank account.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-2 font-medium text-foreground-muted">
              Date
            </th>
            <th className="text-left py-3 px-2 font-medium text-foreground-muted">
              Description
            </th>
            <th className="text-left py-3 px-2 font-medium text-foreground-muted">
              Category
            </th>
            <th className="text-left py-3 px-2 font-medium text-foreground-muted">
              Account
            </th>
            <th className="text-right py-3 px-2 font-medium text-foreground-muted">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => {
            const amount = parseFloat(txn.amount);
            const isIncome = amount < 0;
            return (
              <tr key={txn.id} className="border-b border-border hover:bg-white/5">
                <td className="py-3 px-2 text-foreground-muted whitespace-nowrap">
                  {formatDate(txn.date)}
                </td>
                <td className="py-3 px-2">
                  <div className="font-medium">
                    {txn.merchantName || txn.name}
                  </div>
                  {txn.merchantName && txn.merchantName !== txn.name && (
                    <div className="text-xs text-foreground-tertiary">{txn.name}</div>
                  )}
                  {txn.pending && (
                    <span className="inline-block ml-2 px-1.5 py-0.5 text-xs bg-warning/20 text-warning rounded">
                      Pending
                    </span>
                  )}
                </td>
                <td className="py-3 px-2">
                  {txn.categoryPrimary && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-white/10 text-foreground-muted rounded-full">
                      {txn.categoryPrimary}
                    </span>
                  )}
                </td>
                <td className="py-3 px-2 text-foreground-tertiary text-xs">
                  {txn.accountName}
                  {txn.source === "import" && (
                    <span className="ml-1 px-1 py-0.5 bg-accent/10 text-accent rounded text-[10px]">
                      Import
                    </span>
                  )}
                </td>
                <td
                  className={`py-3 px-2 text-right font-medium whitespace-nowrap ${
                    isIncome ? "text-success" : "text-foreground"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatCurrency(Math.abs(amount))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
