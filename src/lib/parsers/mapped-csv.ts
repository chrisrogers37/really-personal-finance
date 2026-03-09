import Papa from "papaparse";
import type { ParsedTransaction, ParseResult, ColumnMapping } from "./types";

/**
 * Parse a date string using a known format into YYYY-MM-DD.
 * Supports: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, M/D/YYYY variants.
 */
function normalizeDate(raw: string, format?: string): string | null {
  const trimmed = raw.trim();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Try to parse based on explicit format
  if (format === "DD/MM/YYYY") {
    const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
    }
  }

  // Default: MM/DD/YYYY (US format)
  const match = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    return `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  }

  return null;
}

export interface MappedCSVOptions {
  columns: ColumnMapping;
  dateFormat?: string;
  amountConvention: "positive_outflow" | "negative_outflow";
  skipRows: number;
}

/**
 * Parse a CSV using a user-defined column mapping.
 */
export function parseMappedCSV(
  content: string,
  options: MappedCSVOptions
): ParseResult {
  const { columns, dateFormat, amountConvention, skipRows } = options;

  // Skip leading rows if needed
  let csvContent = content;
  if (skipRows > 0) {
    const lines = content.split("\n");
    csvContent = lines.slice(skipRows).join("\n");
  }

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of parsed.data) {
    const dateRaw = row[columns.date]?.trim();
    const description = row[columns.description]?.trim();
    const amountRaw = row[columns.amount]?.trim();

    if (!dateRaw || !description || !amountRaw) {
      errors.push(`Skipped row with missing fields: ${JSON.stringify(row)}`);
      continue;
    }

    const date = normalizeDate(dateRaw, dateFormat);
    if (!date) {
      errors.push(`Could not parse date "${dateRaw}" for "${description}"`);
      continue;
    }

    const amount = parseFloat(amountRaw.replace(/[,$]/g, ""));
    if (isNaN(amount)) {
      errors.push(`Invalid amount "${amountRaw}" for "${description}"`);
      continue;
    }

    // Normalize to Plaid convention: positive = outflow
    const normalizedAmount =
      amountConvention === "negative_outflow" ? -amount : amount;

    const txn: ParsedTransaction = {
      date,
      description,
      amount: normalizedAmount.toFixed(2),
    };

    if (columns.merchantName && row[columns.merchantName]?.trim()) {
      txn.merchantName = row[columns.merchantName].trim();
    }

    if (columns.memo && row[columns.memo]?.trim()) {
      txn.memo = row[columns.memo].trim();
    }

    transactions.push(txn);
  }

  return {
    format: "mapped-csv",
    transactions,
    skippedRows: skipRows,
    errors,
  };
}

/**
 * Extract CSV headers and sample rows (for the column mapper UI).
 */
export function extractCSVHeaders(
  content: string,
  skipRows = 0
): { headers: string[]; sampleRows: Record<string, string>[] } | null {
  let csvContent = content;
  if (skipRows > 0) {
    const lines = content.split("\n");
    csvContent = lines.slice(skipRows).join("\n");
  }

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    preview: 5,
  });

  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    return null;
  }

  return {
    headers: parsed.meta.fields,
    sampleRows: parsed.data,
  };
}
