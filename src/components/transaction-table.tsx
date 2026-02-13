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
            className="h-12 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No transactions found. Adjust your filters or connect a bank account.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium text-gray-600">
              Date
            </th>
            <th className="text-left py-3 px-2 font-medium text-gray-600">
              Description
            </th>
            <th className="text-left py-3 px-2 font-medium text-gray-600">
              Category
            </th>
            <th className="text-left py-3 px-2 font-medium text-gray-600">
              Account
            </th>
            <th className="text-right py-3 px-2 font-medium text-gray-600">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => {
            const amount = parseFloat(txn.amount);
            const isIncome = amount < 0;
            return (
              <tr key={txn.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 text-gray-600 whitespace-nowrap">
                  {formatDate(txn.date)}
                </td>
                <td className="py-3 px-2">
                  <div className="font-medium">
                    {txn.merchantName || txn.name}
                  </div>
                  {txn.merchantName && txn.merchantName !== txn.name && (
                    <div className="text-xs text-gray-400">{txn.name}</div>
                  )}
                  {txn.pending && (
                    <span className="inline-block ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                      Pending
                    </span>
                  )}
                </td>
                <td className="py-3 px-2">
                  {txn.categoryPrimary && (
                    <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                      {txn.categoryPrimary}
                    </span>
                  )}
                </td>
                <td className="py-3 px-2 text-gray-500 text-xs">
                  {txn.accountName}
                </td>
                <td
                  className={`py-3 px-2 text-right font-medium whitespace-nowrap ${
                    isIncome ? "text-green-600" : "text-gray-900"
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
