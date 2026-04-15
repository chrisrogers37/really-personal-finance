import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  decimal,
  date,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "member", "viewer"]);
export const auditActionEnum = pgEnum("audit_action", [
  "auth.login",
  "auth.logout",
  "auth.login_failed",
  "auth.mfa_enrolled",
  "auth.mfa_verified",
  "auth.mfa_disabled",
  "auth.mfa_failed",
  "data.read",
  "data.create",
  "data.update",
  "data.delete",
  "data.export",
  "plaid.link",
  "plaid.sync",
  "plaid.token_access",
  "consent.granted",
  "consent.revoked",
  "admin.role_change",
  "admin.user_deprovisioned",
  "admin.access_review",
]);

// ─── Users (SCD2) ────────────────────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    email: text("email").notNull(),
    name: text("name"),
    role: userRoleEnum("role").notNull().default("member"),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
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

// ─── Bank Accounts ───────────────────────────────────────────────────────────
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    plaidItemId: text("plaid_item_id"),
    plaidAccessToken: text("plaid_access_token"),
    plaidAccountId: text("plaid_account_id"),
    name: text("name").notNull(),
    type: text("type").notNull(),
    subtype: text("subtype"),
    mask: text("mask"),
    source: text("source").notNull().default("plaid"),
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
    plaidTransactionId: text("plaid_transaction_id").unique(),
    importId: text("import_id").unique(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    name: text("name").notNull(),
    merchantName: text("merchant_name"),
    categoryPrimary: text("category_primary"),
    categoryDetailed: text("category_detailed"),
    pending: boolean("pending").notNull().default(false),
    source: text("source").notNull().default("plaid"),
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

// ─── Column Mappings (saved CSV import formats) ──────────────────────────────
export const columnMappings = pgTable(
  "column_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    columns: jsonb("columns").notNull(), // { date: "Post Date", amount: "Amount", ... }
    dateFormat: text("date_format"), // "MM/DD/YYYY" | "YYYY-MM-DD" | "DD/MM/YYYY"
    amountConvention: text("amount_convention").notNull().default("positive_outflow"), // "positive_outflow" | "negative_outflow"
    skipRows: integer("skip_rows").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_column_mappings_user_id").on(table.userId),
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

// ─── Audit Logs ──────────────────────────────────────────────────────────────
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id"),
    action: auditActionEnum("action").notNull(),
    resource: text("resource"), // e.g. "accounts", "transactions", "plaid_token"
    resourceId: text("resource_id"),
    detail: jsonb("detail"), // additional context
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_logs_user_id").on(table.userId),
    index("idx_audit_logs_action").on(table.action),
    index("idx_audit_logs_created_at").on(table.createdAt),
  ]
);

// ─── MFA Credentials (TOTP) ─────────────────────────────────────────────────
export const mfaCredentials = pgTable(
  "mfa_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().unique(),
    totpSecret: text("totp_secret").notNull(), // encrypted with AES-256-GCM
    recoveryCodes: text("recovery_codes").notNull(), // encrypted JSON array
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_mfa_credentials_user_id").on(table.userId),
  ]
);

// ─── Consent Records ────────────────────────────────────────────────────────
export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    consentType: text("consent_type").notNull(), // "plaid_data_access", "privacy_policy", "tos"
    version: text("version").notNull(), // policy version consented to
    grantedAt: timestamp("granted_at", { mode: "date" }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_consent_records_user_id").on(table.userId),
    index("idx_consent_records_type").on(table.userId, table.consentType),
  ]
);
