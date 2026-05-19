import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api-helpers";
import { plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";

export async function POST() {
  const guard = await requireUser();
  if (guard instanceof NextResponse) return guard;
  const { session } = guard;

  const products = (process.env.PLAID_PRODUCTS || "transactions")
    .split(",")
    .map((p) => p.trim() as Products);

  const countryCodes = (process.env.PLAID_COUNTRY_CODES || "US")
    .split(",")
    .map((c) => c.trim() as CountryCode);

  const response = await plaidClient.linkTokenCreate({
    user: { client_user_id: session.user.id },
    client_name: "Really Personal Finance",
    products,
    country_codes: countryCodes,
    language: "en",
    transactions: {
      days_requested: 730,
    },
  });

  return NextResponse.json({ linkToken: response.data.link_token });
}
