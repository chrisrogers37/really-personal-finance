import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  decimal,
  date,
  index,
} from "drizzle-orm/pg-core";

// ─── Users (SCD2) ────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    validFrom: timestamp("valid_from", { mode: "date" }).notNull().defaultNow(),
    validTo: timestamp("valid_to", { mode: "date" }),
    isCurrent: boolean("is_current").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_users_user_id").on(table.userId),
    index("idx_users_email_current").on(table.email, table.isCurrent),
    index("idx_users_current").on(table.userId, table.isCurrent),
  ]
);

// ─── NextAuth required tables ─────────────────────────────────────────────────
export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => [
    index("idx_auth_accounts_user_id").on(table.userId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionToken: text("session_token").notNull().unique(),
    userId: uuid("user_id").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
  ]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  }
);

// ─── Bank Accounts (via Plaid) ────────────────────────────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    plaidItemId: text("plaid_item_id").notNull(),
    plaidAccessToken: text("plaid_access_token").notNull(),
    plaidAccountId: text("plaid_account_id").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    subtype: text("subtype"),
    mask: text("mask"),
    cursor: text("cursor"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_accounts_user_id").on(table.userId),
    index("idx_accounts_plaid_item_id").on(table.plaidItemId),
  ]
);

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id").notNull(),
    userId: uuid("user_id").notNull(),
    plaidTransactionId: text("plaid_transaction_id").notNull().unique(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    name: text("name").notNull(),
    merchantName: text("merchant_name"),
    categoryPrimary: text("category_primary"),
    categoryDetailed: text("category_detailed"),
    pending: boolean("pending").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_transactions_user_id").on(table.userId),
    index("idx_transactions_account_id").on(table.accountId),
    index("idx_transactions_date").on(table.userId, table.date),
    index("idx_transactions_category").on(table.userId, table.categoryPrimary),
    index("idx_transactions_merchant").on(table.userId, table.merchantName),
    index("idx_transactions_plaid_id").on(table.plaidTransactionId),
  ]
);

// ─── Telegram Config ──────────────────────────────────────────────────────────
export const telegramConfigs = pgTable(
  "telegram_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().unique(),
    chatId: text("chat_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_telegram_configs_user_id").on(table.userId),
  ]
);
