import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/db";
import {
  users,
  accounts,
  transactions,
  sessions,
  authAccounts,
  consentRecords,
  columnMappings,
  telegramConfigs,
  mfaCredentials,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { confirmation } = body;

  if (confirmation !== "DELETE_ALL_MY_DATA") {
    return NextResponse.json(
      { error: 'Must confirm with { "confirmation": "DELETE_ALL_MY_DATA" }' },
      { status: 400 },
    );
  }

  const userId = session.user.id;

  // Log the deletion request BEFORE deleting
  await audit({
    userId,
    action: "data.delete",
    resource: "user_data",
    detail: { type: "full_account_deletion" },
    request,
  });

  await db.transaction(async (tx) => {
    // Transactions depend on accounts, so delete first
    await tx.delete(transactions).where(eq(transactions.userId, userId));
    await tx.delete(accounts).where(eq(accounts.userId, userId));

    // These are independent of each other
    await Promise.all([
      tx.delete(consentRecords).where(eq(consentRecords.userId, userId)),
      tx.delete(columnMappings).where(eq(columnMappings.userId, userId)),
      tx.delete(telegramConfigs).where(eq(telegramConfigs.userId, userId)),
      tx.delete(mfaCredentials).where(eq(mfaCredentials.userId, userId)),
      tx.delete(sessions).where(eq(sessions.userId, userId)),
      tx.delete(authAccounts).where(eq(authAccounts.userId, userId)),
    ]);

    // Soft-delete user (preserve audit trail)
    await tx
      .update(users)
      .set({ isCurrent: false, validTo: new Date() })
      .where(eq(users.userId, userId));
  });

  return NextResponse.json({ deleted: true });
}
