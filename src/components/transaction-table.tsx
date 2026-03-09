"use client";

import { formatCurrency, formatDate } from "@/lib/utils";
import { Pencil } from "lucide-react";
import type { Transaction } from "@/types";

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
  onEditTransaction?: (transaction: Transaction) => void;
}

export function TransactionTable({
  transactions,
  loading,
  onEditTransaction,
}: TransactionTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg shimmer-bg animate-shimmer"
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
              <tr key={txn.id} className="border-b border-border hover:bg-white/5 transition-colors duration-150">
                <td className="py-3 px-2 text-foreground-muted whitespace-nowrap">
                  {formatDate(txn.date)}
                </td>
                <td className="py-3 px-2">
                  <div
                    className={`font-medium ${onEditTransaction ? "group/merchant cursor-pointer hover:text-accent inline-flex items-center gap-1 transition-colors" : ""}`}
                    onClick={() => onEditTransaction?.(txn)}
                  >
                    {txn.merchantName || txn.name}
                    {onEditTransaction && (
                      <Pencil className="w-3 h-3 opacity-0 group-hover/merchant:opacity-60 transition-opacity" />
                    )}
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
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      txn.categoryPrimary
                        ? "bg-white/10 text-foreground-muted"
                        : "bg-white/5 text-foreground-tertiary border border-dashed border-border"
                    } ${onEditTransaction ? "cursor-pointer hover:bg-accent/20 hover:text-accent group/cat transition-colors" : ""}`}
                    onClick={() => onEditTransaction?.(txn)}
                  >
                    {txn.categoryPrimary || "Uncategorized"}
                    {onEditTransaction && (
                      <Pencil className="w-2.5 h-2.5 ml-1 inline opacity-0 group-hover/cat:opacity-60 transition-opacity" />
                    )}
                  </span>
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
