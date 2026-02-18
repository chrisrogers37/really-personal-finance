import { createHash } from "crypto";
import type { ParsedTransaction } from "@/lib/parsers/types";

/**
 * Generate a deterministic import ID for dedup.
 * OFX transactions with FITID: "fitid:<fitid>"
 * CSV transactions: SHA-256 of "date|description|amount"
 */
export function generateImportId(txn: ParsedTransaction): string {
  if (txn.externalId) {
    return `fitid:${txn.externalId}`;
  }
  const raw = `${txn.date}|${txn.description.trim().toLowerCase()}|${txn.amount}`;
  return `hash:${createHash("sha256").update(raw).digest("hex").substring(0, 32)}`;
}

export interface DuplicateMatch {
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

// ─── Confirm Input Validation ─────────────────────────────────────────────────

export interface ConfirmTransaction {
  date: string;
  description: string;
  amount: string;
  merchantName?: string;
  importId: string;
}

export interface ConfirmInput {
  accountId: string;
  transactions: ConfirmTransaction[];
}

export function validateConfirmInput(
  input: unknown
): ConfirmInput | { error: string } {
  if (!input || typeof input !== "object") {
    return { error: "Request body is required" };
  }

  const { accountId, transactions: txns } = input as Record<string, unknown>;

  if (!accountId || typeof accountId !== "string") {
    return { error: "accountId is required" };
  }
  if (!Array.isArray(txns) || txns.length === 0) {
    return { error: "transactions array is required and must not be empty" };
  }

  const validated: ConfirmTransaction[] = [];
  for (let i = 0; i < txns.length; i++) {
    const t = txns[i];
    if (!t || typeof t !== "object") {
      return { error: `Transaction at index ${i} is invalid` };
    }
    const { date, description, amount, importId, merchantName } = t as Record<
      string,
      unknown
    >;
    if (!date || typeof date !== "string") {
      return { error: `Transaction at index ${i}: date is required` };
    }
    if (!description || typeof description !== "string") {
      return { error: `Transaction at index ${i}: description is required` };
    }
    if (!amount || typeof amount !== "string") {
      return { error: `Transaction at index ${i}: amount is required` };
    }
    if (!importId || typeof importId !== "string") {
      return { error: `Transaction at index ${i}: importId is required` };
    }
    validated.push({
      date,
      description,
      amount,
      importId,
      merchantName:
        typeof merchantName === "string" && merchantName.trim()
          ? merchantName.trim()
          : undefined,
    });
  }

  return { accountId, transactions: validated };
}
