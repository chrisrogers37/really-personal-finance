export interface ParsedTransaction {
  date: string; // YYYY-MM-DD (normalized)
  description: string; // Raw merchant/description text
  amount: string; // Decimal string, Plaid convention: positive = outflow, negative = inflow
  merchantName?: string; // Cleaned merchant name if available
  externalId?: string; // Bank-provided transaction ID (FITID from OFX)
  memo?: string; // Additional detail (OFX MEMO field)
  type?: string; // DEBIT/CREDIT from OFX
}

export interface ParseResult {
  format: "amex-csv" | "bofa-csv" | "headerless-csv" | "ofx" | "mapped-csv" | "unknown-csv";
  accountHint?: string; // Account identifier from file (OFX ACCTID)
  transactions: ParsedTransaction[];
  skippedRows?: number; // Header/summary rows skipped
  errors: string[]; // Non-fatal parse warnings
}

/** User-defined column mapping for arbitrary CSV formats */
export interface ColumnMapping {
  date: string; // CSV header name mapped to date
  amount: string; // CSV header name mapped to amount
  description: string; // CSV header name mapped to description
  merchantName?: string; // CSV header name mapped to merchant (optional)
  category?: string; // CSV header name mapped to category (optional)
  memo?: string; // CSV header name mapped to memo/notes (optional)
}

/** Saved mapping configuration (stored in DB) */
export interface SavedColumnMapping {
  id: string;
  name: string;
  columns: ColumnMapping;
  dateFormat?: string; // "MM/DD/YYYY" | "YYYY-MM-DD" | "DD/MM/YYYY"
  amountConvention: "positive_outflow" | "negative_outflow";
  skipRows: number;
}
