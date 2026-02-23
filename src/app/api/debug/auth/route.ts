import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars (names only, not values)
  checks.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ? "SET" : "MISSING";
  checks.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ? "SET" : "MISSING";
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? "SET" : "MISSING";
  checks.AUTH_SECRET = process.env.AUTH_SECRET ? "SET" : "MISSING";
  checks.AUTH_TRUST_HOST = process.env.AUTH_TRUST_HOST ? "SET" : "MISSING";
  checks.NEXTAUTH_URL = process.env.NEXTAUTH_URL ? "SET" : "MISSING";
  checks.DATABASE_URL = process.env.DATABASE_URL ? "SET" : "MISSING";

  // Test DB connection
  try {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    checks.DB_CONNECTION = `OK (${result[0].count} users)`;
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    checks.DB_CONNECTION = `FAILED: ${err.message}`;
    checks.DB_ERROR_NAME = err.name;
    checks.DB_ERROR_CAUSE = err.cause ? String(err.cause) : "none";
    checks.DB_URL_PREFIX = process.env.DATABASE_URL?.substring(0, 30) + "..." || "MISSING";
  }

  return NextResponse.json(checks);
}
