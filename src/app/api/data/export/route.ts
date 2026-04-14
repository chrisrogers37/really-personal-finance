import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/db";
import { users, accounts, transactions, consentRecords, columnMappings, telegramConfigs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Export all user data (GDPR/CCPA-style data portability)
  const [userData, userAccounts, userTransactions, userConsents, userMappings, userTelegram] =
    await Promise.all([
      db
        .select({
          email: users.email,
          name: users.name,
          role: users.role,
          emailVerified: users.emailVerified,
          validFrom: users.validFrom,
          validTo: users.validTo,
          isCurrent: users.isCurrent,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.userId, userId)),
      db
        .select({
          id: accounts.id,
          name: accounts.name,
          type: accounts.type,
          subtype: accounts.subtype,
          mask: accounts.mask,
          source: accounts.source,
          createdAt: accounts.createdAt,
        })
        .from(accounts)
        .where(eq(accounts.userId, userId)),
      db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          date: transactions.date,
          name: transactions.name,
          merchantName: transactions.merchantName,
          categoryPrimary: transactions.categoryPrimary,
          categoryDetailed: transactions.categoryDetailed,
          source: transactions.source,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .where(eq(transactions.userId, userId)),
      db.select().from(consentRecords).where(eq(consentRecords.userId, userId)),
      db.select().from(columnMappings).where(eq(columnMappings.userId, userId)),
      db.select().from(telegramConfigs).where(eq(telegramConfigs.userId, userId)),
    ]);

  await audit({
    userId,
    action: "data.export",
    resource: "user_data",
    detail: {
      accountCount: userAccounts.length,
      transactionCount: userTransactions.length,
    },
    request,
  });

  return NextResponse.json({
    exportDate: new Date().toISOString(),
    user: userData,
    accounts: userAccounts,
    transactions: userTransactions,
    consents: userConsents,
    columnMappings: userMappings,
    telegramConfig: userTelegram,
  });
}
