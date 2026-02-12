import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { encrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { publicToken } = await request.json();

  if (!publicToken || typeof publicToken !== "string") {
    return NextResponse.json(
      { error: "publicToken is required" },
      { status: 400 }
    );
  }

  // Exchange public token for access token
  const exchangeResponse = await plaidClient.itemPublicTokenExchange({
    public_token: publicToken,
  });

  const accessToken = exchangeResponse.data.access_token;
  const itemId = exchangeResponse.data.item_id;

  // Get account details
  const accountsResponse = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  // Store each account with encrypted access token
  const encryptedToken = encrypt(accessToken);

  const inserted = await Promise.all(
    accountsResponse.data.accounts.map((acct) =>
      db
        .insert(accounts)
        .values({
          userId: session.user!.id!,
          plaidItemId: itemId,
          plaidAccessToken: encryptedToken,
          plaidAccountId: acct.account_id,
          name: acct.name,
          type: acct.type,
          subtype: acct.subtype ?? null,
          mask: acct.mask ?? null,
        })
        .returning()
    )
  );

  return NextResponse.json({
    accounts: inserted.flat().map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      mask: a.mask,
    })),
  });
}
