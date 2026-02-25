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
  format: "amex-csv" | "bofa-csv" | "ofx" | "unknown-csv";
  accountHint?: string; // Account identifier from file (OFX ACCTID)
  transactions: ParsedTransaction[];
  skippedRows?: number; // Header/summary rows skipped
  errors: string[]; // Non-fatal parse warnings
}
