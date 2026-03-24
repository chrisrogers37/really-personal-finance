"use client";

import { useState, useCallback, useMemo } from "react";
import { GripVertical, X, Check } from "lucide-react";
import { formatCurrency, parseAmount } from "@/lib/utils";
import type { ColumnMapping, MappingConfig, AmountConvention } from "@/lib/parsers/types";

// ─── Target field definitions ────────────────────────────────────────────────

interface TargetField {
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
}

const TARGET_FIELDS: TargetField[] = [
  { key: "date", label: "Date", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "description", label: "Description", required: true },
  { key: "merchantName", label: "Merchant Name", required: false },
  { key: "category", label: "Category", required: false },
  { key: "memo", label: "Memo / Notes", required: false },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface ColumnMapperProps {
  headers: string[];
  sampleRows: Record<string, string>[];
  onConfirm: (config: MappingConfig) => void;
  /** Pre-fill from a saved mapping */
  initialMapping?: ColumnMapping;
  loading?: boolean;
}

export function ColumnMapper({
  headers,
  sampleRows,
  onConfirm,
  initialMapping,
  loading = false,
}: ColumnMapperProps) {
  // mapping: target field key → source column header
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(() => {
    if (initialMapping) return { ...initialMapping };
    // Auto-guess common column names
    const guess: Partial<ColumnMapping> = {};
    for (const header of headers) {
      const lower = header.toLowerCase().trim();
      if (!guess.date && (lower === "date" || lower === "transaction date" || lower === "post date" || lower === "posting date")) {
        guess.date = header;
      }
      if (!guess.amount && (lower === "amount" || lower === "transaction amount" || lower === "debit/credit")) {
        guess.amount = header;
      }
      if (!guess.description && (lower === "description" || lower === "memo" || lower === "transaction description" || lower === "payee")) {
        guess.description = header;
      }
      if (!guess.merchantName && (lower === "merchant" || lower === "merchant name")) {
        guess.merchantName = header;
      }
      if (!guess.category && (lower === "category" || lower === "type")) {
        guess.category = header;
      }
    }
    return guess;
  });

  const [dateFormat, setDateFormat] = useState<string>("MM/DD/YYYY");
  const [amountConvention, setAmountConvention] = useState<
    AmountConvention
  >("positive_outflow");
  const [skipRows, setSkipRows] = useState(0);
  const [saveName, setSaveName] = useState("");
  const [wantSave, setWantSave] = useState(false);
  const [draggedHeader, setDraggedHeader] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Which source headers are already mapped
  const mappedHeaders = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean)),
    [mapping]
  );

  const isComplete =
    mapping.date && mapping.amount && mapping.description;

  // Pre-compute header → first sample value map
  const sampleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const header of headers) {
      for (const row of sampleRows) {
        if (row[header]?.trim()) {
          map.set(header, row[header].trim());
          break;
        }
      }
    }
    return map;
  }, [headers, sampleRows]);

  // ─── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: React.DragEvent, header: string) => {
      setDraggedHeader(header);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", header);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetKey: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverTarget(targetKey);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverTarget(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetKey: keyof ColumnMapping) => {
      e.preventDefault();
      const header = e.dataTransfer.getData("text/plain");
      if (!header) return;

      setMapping((prev) => {
        const next = { ...prev };
        // Remove this header from any other target it was mapped to
        for (const key of Object.keys(next) as (keyof ColumnMapping)[]) {
          if (next[key] === header) {
            delete next[key];
          }
        }
        next[targetKey] = header;
        return next;
      });

      setDraggedHeader(null);
      setDragOverTarget(null);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggedHeader(null);
    setDragOverTarget(null);
  }, []);

  const unmap = useCallback((targetKey: keyof ColumnMapping) => {
    setMapping((prev) => {
      const next = { ...prev };
      delete next[targetKey];
      return next;
    });
  }, []);

  const handleConfirm = () => {
    if (!isComplete) return;
    onConfirm({
      columns: mapping as ColumnMapping,
      dateFormat,
      amountConvention,
      skipRows,
      saveName: wantSave && saveName.trim() ? saveName.trim() : undefined,
    });
  };

  const getSample = useCallback(
    (header: string) => sampleMap.get(header) ?? "—",
    [sampleMap]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-1">Map Your Columns</h2>
        <p className="text-sm text-foreground-muted mb-6">
          Drag columns from your CSV to their matching fields, or click to assign.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Target fields */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider mb-3">
              Required Fields
            </p>
            {TARGET_FIELDS.filter((f) => f.required).map((field) => (
              <TargetSlot
                key={field.key}
                field={field}
                mappedHeader={mapping[field.key] || null}
                getSample={getSample}
                isDragOver={dragOverTarget === field.key}
                onDragOver={(e) => handleDragOver(e, field.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, field.key)}
                onUnmap={() => unmap(field.key)}
              />
            ))}

            <p className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider mb-3 mt-5 pt-3 border-t border-border">
              Optional Fields
            </p>
            {TARGET_FIELDS.filter((f) => !f.required).map((field) => (
              <TargetSlot
                key={field.key}
                field={field}
                mappedHeader={mapping[field.key] || null}
                getSample={getSample}
                isDragOver={dragOverTarget === field.key}
                onDragOver={(e) => handleDragOver(e, field.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, field.key)}
                onUnmap={() => unmap(field.key)}
              />
            ))}
          </div>

          {/* Right: Source columns */}
          <div>
            <p className="text-xs font-medium text-foreground-tertiary uppercase tracking-wider mb-3">
              Your CSV Columns
            </p>
            <div className="space-y-1.5">
              {headers.map((header) => {
                const isMapped = mappedHeaders.has(header);
                const isDragging = draggedHeader === header;
                return (
                  <div
                    key={header}
                    draggable={!isMapped}
                    onDragStart={(e) => handleDragStart(e, header)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-150
                      ${isMapped
                        ? "bg-success/5 border-success/20 opacity-50 cursor-default"
                        : "bg-background-elevated border-border cursor-grab active:cursor-grabbing hover:border-accent/40 hover:bg-accent/5"
                      }
                      ${isDragging ? "opacity-30 scale-95" : ""}
                    `}
                  >
                    {!isMapped && (
                      <GripVertical className="w-4 h-4 text-foreground-tertiary shrink-0" />
                    )}
                    {isMapped && (
                      <Check className="w-4 h-4 text-success shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{header}</div>
                      <div className="text-xs text-foreground-tertiary truncate">
                        {getSample(header)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-border p-6">
        <h3 className="text-sm font-semibold mb-4">Import Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Date Format
            </label>
            <select
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150 appearance-none"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Amount Convention
            </label>
            <select
              value={amountConvention}
              onChange={(e) =>
                setAmountConvention(
                  e.target.value as AmountConvention
                )
              }
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150 appearance-none"
            >
              <option value="positive_outflow">Positive = Expense</option>
              <option value="negative_outflow">Negative = Expense</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Skip Header Rows
            </label>
            <input
              type="number"
              min={0}
              max={20}
              value={skipRows}
              onChange={(e) => setSkipRows(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
            />
          </div>
        </div>

        {/* Amount preview */}
        {mapping.amount && (
          <div className="mt-4 p-3 rounded-xl bg-background-elevated border border-border">
            <p className="text-xs text-foreground-muted mb-2">Amount preview with current settings:</p>
            <div className="flex gap-4 text-sm">
              {sampleRows.slice(0, 3).map((row, i) => {
                const raw = row[mapping.amount!];
                if (!raw) return null;
                const val = parseAmount(raw);
                if (isNaN(val)) return null;
                const normalized = amountConvention === "negative_outflow" ? -val : val;
                const isExpense = normalized > 0;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-foreground-tertiary">{raw}</span>
                    <span className="text-foreground-tertiary">&rarr;</span>
                    <span className={isExpense ? "text-foreground" : "text-success"}>
                      {isExpense ? "-" : "+"}
                      {formatCurrency(Math.abs(normalized))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Save mapping */}
      <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-border p-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={wantSave}
            onChange={(e) => setWantSave(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-background-elevated text-accent focus:ring-accent accent-accent"
          />
          <span className="text-sm font-medium">
            Save this format for future imports
          </span>
        </label>
        {wantSave && (
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="e.g., Chase Checking, Capital One Visa"
            className="mt-3 w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-foreground-tertiary focus:ring-2 focus:ring-accent focus:border-accent outline-none transition-all duration-150"
          />
        )}
      </div>

      {/* Data preview */}
      {isComplete && (
        <div className="bg-background-card backdrop-blur-xl rounded-2xl border border-border p-6">
          <h3 className="text-sm font-semibold mb-3">Preview</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-foreground-tertiary text-xs uppercase tracking-wider border-b border-border">
                  <th className="p-2">Date</th>
                  <th className="p-2">Description</th>
                  {mapping.merchantName && <th className="p-2">Merchant</th>}
                  <th className="p-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sampleRows.map((row, i) => {
                  const rawAmount = row[mapping.amount!];
                  const val = rawAmount ? parseAmount(rawAmount) : 0;
                  const normalized =
                    amountConvention === "negative_outflow" ? -val : val;
                  const isExpense = normalized > 0;
                  return (
                    <tr key={i} className="border-b border-border">
                      <td className="p-2 whitespace-nowrap">
                        {row[mapping.date!] || "—"}
                      </td>
                      <td className="p-2">
                        {row[mapping.description!] || "—"}
                      </td>
                      {mapping.merchantName && (
                        <td className="p-2 text-foreground-muted">
                          {row[mapping.merchantName] || "—"}
                        </td>
                      )}
                      <td
                        className={`p-2 text-right whitespace-nowrap font-medium ${
                          isExpense ? "text-foreground" : "text-success"
                        }`}
                      >
                        {isExpense ? "-" : "+"}
                        {formatCurrency(Math.abs(normalized))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Continue button */}
      <div className="flex justify-end">
        <button
          onClick={handleConfirm}
          disabled={!isComplete || loading}
          className="px-6 py-2.5 bg-accent text-white rounded-xl font-medium hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
        >
          {loading ? "Processing..." : "Continue to Preview"}
        </button>
      </div>
    </div>
  );
}

// ─── Target Slot sub-component ───────────────────────────────────────────────

function TargetSlot({
  field,
  mappedHeader,
  getSample,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onUnmap,
}: {
  field: TargetField;
  mappedHeader: string | null;
  getSample: (h: string) => string;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onUnmap: () => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all duration-150
        ${mappedHeader
          ? "border-success/30 bg-success/5"
          : isDragOver
            ? "border-accent bg-accent/10 scale-[1.01]"
            : "border-dashed border-border bg-background-elevated/50"
        }
      `}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{field.label}</span>
          {field.required && !mappedHeader && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning font-medium">
              Required
            </span>
          )}
        </div>
        {mappedHeader ? (
          <div className="text-xs text-foreground-muted mt-0.5 truncate">
            &larr; <span className="font-medium text-foreground">{mappedHeader}</span>
            <span className="text-foreground-tertiary ml-2">({getSample(mappedHeader)})</span>
          </div>
        ) : (
          <div className="text-xs text-foreground-tertiary mt-0.5">
            Drag a column here
          </div>
        )}
      </div>
      {mappedHeader && (
        <button
          onClick={onUnmap}
          className="p-1 text-foreground-tertiary hover:text-danger transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
