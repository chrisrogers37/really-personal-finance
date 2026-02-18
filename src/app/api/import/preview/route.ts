import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { parseTransactionFile } from "@/lib/parsers";
import { generateImportId } from "@/lib/import";
import type { DuplicateMatch } from "@/lib/import";
import type { ParsedTransaction } from "@/lib/parsers/types";

async function findDuplicates(
  userId: string,
  parsed: ParsedTransaction[],
  importIds: string[]
): Promise<DuplicateMatch[]> {
  if (parsed.length === 0) return [];

  const dates = parsed.map((t) => t.date);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));

  const existing = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      name: transactions.name,
      amount: transactions.amount,
      importId: transactions.importId,
      source: transactions.source,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, minDate),
        lte(transactions.date, maxDate)
      )
    );

  const existingImportIds = new Set(
    existing.filter((e) => e.importId).map((e) => e.importId!)
  );

  const duplicates: DuplicateMatch[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const txn = parsed[i];
    const importId = importIds[i];

    // Exact import ID match
    if (existingImportIds.has(importId)) {
      const match = existing.find((e) => e.importId === importId);
      if (match) {
        duplicates.push({
          importIndex: i,
          existingTransaction: {
            id: match.id,
            date: match.date,
            name: match.name,
            amount: match.amount,
            source: match.source,
          },
          reason: "exact_import_id",
        });
        continue;
      }
    }

    // Fuzzy match: same date + same amount
    const fuzzyMatch = existing.find(
      (e) =>
        e.date === txn.date &&
        Math.abs(parseFloat(e.amount) - parseFloat(txn.amount)) < 0.01
    );

    if (fuzzyMatch) {
      duplicates.push({
        importIndex: i,
        existingTransaction: {
          id: fuzzyMatch.id,
          date: fuzzyMatch.date,
          name: fuzzyMatch.name,
          amount: fuzzyMatch.amount,
          source: fuzzyMatch.source,
        },
        reason: "same_date_amount",
      });
    }
  }

  return duplicates;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 5MB)" },
      { status: 400 }
    );
  }

  const content = await file.text();
  const result = parseTransactionFile(content, file.name);

  if (result.transactions.length === 0) {
    return NextResponse.json(
      {
        error: "No transactions found in file",
        parseErrors: result.errors,
      },
      { status: 400 }
    );
  }

  const importIds = result.transactions.map(generateImportId);
  const duplicates = await findDuplicates(
    session.user.id,
    result.transactions,
    importIds
  );
  const dupIndexes = new Set(duplicates.map((d) => d.importIndex));

  return NextResponse.json({
    format: result.format,
    accountHint: result.accountHint,
    totalCount: result.transactions.length,
    newCount: result.transactions.length - dupIndexes.size,
    duplicateCount: dupIndexes.size,
    transactions: result.transactions.map((txn, i) => ({
      ...txn,
      importId: importIds[i],
      isDuplicate: dupIndexes.has(i),
    })),
    duplicates,
    parseErrors: result.errors,
  });
}
