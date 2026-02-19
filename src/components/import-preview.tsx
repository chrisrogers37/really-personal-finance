"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PreviewTransaction {
  date: string;
  description: string;
  amount: string;
  merchantName?: string;
  importId: string;
  isDuplicate: boolean;
}

interface Duplicate {
  importIndex: number;
  existingTransaction: {
    id: string;
    date: string;
    name: string;
    amount: string;
    source: string;
  };
  reason: "exact_import_id" | "same_date_amount";
}

interface ImportPreviewProps {
  transactions: PreviewTransaction[];
  duplicates: Duplicate[];
  format: string;
  onConfirm: (selectedIndexes: number[]) => void;
  loading?: boolean;
}

export function ImportPreview({
  transactions,
  duplicates,
  format,
  onConfirm,
  loading = false,
}: ImportPreviewProps) {
  const dupMap = new Map<number, Duplicate>();
  for (const dup of duplicates) {
    dupMap.set(dup.importIndex, dup);
  }

  const [selected, setSelected] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    transactions.forEach((_, i) => {
      const dup = dupMap.get(i);
      if (!dup || dup.reason !== "exact_import_id") {
        initial.add(i);
      }
    });
    return initial;
  });

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(transactions.map((_, i) => i)));
    } else {
      setSelected(new Set());
    }
  };

  const toggle = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const newCount = transactions.filter((_, i) => !dupMap.has(i)).length;
  const dupCount = dupMap.size;

  return (
    <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-border p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-foreground-muted">
            Detected format: <span className="font-medium">{format}</span>
          </p>
          <p className="text-sm text-foreground-muted">
            {transactions.length} transactions: {newCount} new, {dupCount}{" "}
            duplicates
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="text-sm text-accent hover:text-accent-hover"
          >
            Select all
          </button>
          <span className="text-foreground-tertiary">|</span>
          <button
            onClick={() => toggleAll(false)}
            className="text-sm text-accent hover:text-accent-hover"
          >
            Deselect all
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background-elevated">
            <tr className="text-left text-foreground-tertiary">
              <th className="p-2 w-8"></th>
              <th className="p-2">Date</th>
              <th className="p-2">Description</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn, i) => {
              const dup = dupMap.get(i);
              const amount = parseFloat(txn.amount);
              const isInflow = amount < 0;

              return (
                <tr
                  key={i}
                  className={
                    dup?.reason === "exact_import_id"
                      ? "bg-danger/10"
                      : dup
                        ? "bg-warning/10"
                        : ""
                  }
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggle(i)}
                    />
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {formatDate(txn.date)}
                  </td>
                  <td className="p-2 truncate max-w-xs">{txn.description}</td>
                  <td
                    className={`p-2 text-right whitespace-nowrap ${isInflow ? "text-success" : ""}`}
                  >
                    {isInflow ? "+" : "-"}
                    {formatCurrency(Math.abs(amount))}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {!dup && (
                      <span className="text-success text-xs font-medium">
                        New
                      </span>
                    )}
                    {dup?.reason === "exact_import_id" && (
                      <span className="text-danger text-xs font-medium">
                        Already imported
                      </span>
                    )}
                    {dup?.reason === "same_date_amount" && (
                      <span className="text-warning text-xs font-medium">
                        Possible duplicate
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onConfirm(Array.from(selected))}
          disabled={selected.size === 0 || loading}
          className="px-6 py-2 bg-accent text-foreground rounded-lg
                     hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Importing..."
            : `Import ${selected.size} transaction${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </div>
  );
}
