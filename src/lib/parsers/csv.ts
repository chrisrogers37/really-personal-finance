import Papa from "papaparse";
import type { ParsedTransaction, ParseResult } from "./types";

/** MM/DD/YYYY → YYYY-MM-DD */
function parseMMDDYYYY(date: string): string {
  const [month, day, year] = date.split("/");
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** Detect if a date string is YYYY-MM-DD format */
function isISODate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function detectCSVFormat(headers: string[]): "amex-csv" | "bofa-csv" | null {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  if (normalized.includes("running bal.")) return "bofa-csv";
  // Amex: has Date, Description, Amount headers (may have additional columns)
  if (
    normalized.includes("date") &&
    normalized.includes("description") &&
    normalized.includes("amount")
  )
    return "amex-csv";
  return null;
}

function parseAmexCSV(content: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of parsed.data) {
    const dateRaw = row["Date"]?.trim();
    const description = row["Description"]?.trim();
    const amountRaw = row["Amount"]?.trim();

    if (!dateRaw || !description || !amountRaw) {
      errors.push(`Skipped row with missing fields: ${JSON.stringify(row)}`);
      continue;
    }

    const amount = parseFloat(amountRaw);
    if (isNaN(amount)) {
      errors.push(`Invalid amount "${amountRaw}" for "${description}"`);
      continue;
    }

    transactions.push({
      date: isISODate(dateRaw) ? dateRaw : parseMMDDYYYY(dateRaw),
      description,
      // Amex CSV: positive = charge (outflow), matches Plaid convention
      amount: amount.toFixed(2),
    });
  }

  return { format: "amex-csv", transactions, errors };
}

function parseBofACSV(content: string): ParseResult {
  // Find the actual header row (starts with "Date,Description,Amount,Running Bal.")
  const lines = content.split("\n");
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("Date,Description,Amount,Running Bal.")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    return {
      format: "bofa-csv",
      transactions: [],
      errors: ["Could not find column headers in BofA CSV"],
    };
  }

  const skippedRows = headerIndex; // Summary rows before the header
  const dataContent = lines.slice(headerIndex).join("\n");

  const parsed = Papa.parse<Record<string, string>>(dataContent, {
    header: true,
    skipEmptyLines: true,
  });

  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of parsed.data) {
    const dateRaw = row["Date"]?.trim();
    const description = row["Description"]?.trim();
    const amountRaw = row["Amount"]?.trim();

    if (!dateRaw || !description) continue;

    // Skip "Beginning balance" rows (they have no amount)
    if (description.toLowerCase().includes("beginning balance")) continue;

    if (!amountRaw) {
      errors.push(`Skipped row with missing amount: "${description}"`);
      continue;
    }

    // Strip comma thousands separator before parsing
    const amount = parseFloat(amountRaw.replace(/,/g, ""));
    if (isNaN(amount)) {
      errors.push(`Invalid amount "${amountRaw}" for "${description}"`);
      continue;
    }

    transactions.push({
      date: parseMMDDYYYY(dateRaw),
      description,
      // BofA: negative = outflow → negate to match Plaid (positive = outflow)
      amount: (-amount).toFixed(2),
    });
  }

  return { format: "bofa-csv", transactions, skippedRows, errors };
}

function parseHeaderlessCSV(content: string): ParseResult {
  const parsed = Papa.parse<string[]>(content, {
    header: false,
    skipEmptyLines: true,
  });

  const transactions: ParsedTransaction[] = [];
  const errors: string[] = [];

  for (const row of parsed.data) {
    const dateRaw = row[0]?.trim();
    const description = row[1]?.trim();
    const amountRaw = row[2]?.trim();

    if (!dateRaw || !description || !amountRaw) {
      errors.push(`Skipped row with missing fields: ${JSON.stringify(row)}`);
      continue;
    }

    const amount = parseFloat(amountRaw.replace(/,/g, ""));
    if (isNaN(amount)) {
      errors.push(`Invalid amount "${amountRaw}" for "${description}"`);
      continue;
    }

    transactions.push({
      date: dateRaw,
      description,
      // Headerless CSV: negative = outflow → negate to match Plaid convention
      amount: (-amount).toFixed(2),
    });
  }

  return { format: "headerless-csv", transactions, errors };
}

export function parseCSV(content: string, filename?: string): ParseResult {
  if (!content.trim()) {
    return { format: "amex-csv", transactions: [], errors: ["Empty file"] };
  }

  // Try to detect format from headers
  // First, find the header line (skip any summary header rows)
  const lines = content.split("\n");

  // Check if it's BofA format by scanning for the "Running Bal." header
  for (const line of lines) {
    if (line.startsWith("Date,Description,Amount,Running Bal.")) {
      return parseBofACSV(content);
    }
  }

  // Try as Amex CSV (with headers)
  const firstLine = lines[0]?.trim();
  if (firstLine) {
    const headers = firstLine.split(",");
    const format = detectCSVFormat(headers);
    if (format === "amex-csv") {
      return parseAmexCSV(content);
    }
  }

  // Try as headerless CSV (e.g., BofA savings/checking with no headers)
  // Format: YYYY-MM-DD,"Description",Amount
  if (firstLine && isISODate(firstLine.split(",")[0]?.trim().replace(/"/g, ""))) {
    return parseHeaderlessCSV(content);
  }

  return {
    format: "unknown-csv",
    transactions: [],
    errors: [`Unknown CSV format. Headers: "${lines[0]?.trim()}"`],
  };
}
