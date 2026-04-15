import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.login_failed"
  | "auth.mfa_enrolled"
  | "auth.mfa_verified"
  | "auth.mfa_disabled"
  | "auth.mfa_failed"
  | "data.read"
  | "data.create"
  | "data.update"
  | "data.delete"
  | "data.export"
  | "plaid.link"
  | "plaid.sync"
  | "plaid.token_access"
  | "consent.granted"
  | "consent.revoked"
  | "admin.role_change"
  | "admin.user_deprovisioned"
  | "admin.access_review";

interface AuditEntry {
  userId?: string | null;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  detail?: Record<string, unknown>;
  request?: Request;
}

/**
 * Swallows errors so audit failures never break the caller.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const ipAddress = entry.request?.headers.get("x-forwarded-for")
      ?? entry.request?.headers.get("x-real-ip")
      ?? null;
    const userAgent = entry.request?.headers.get("user-agent") ?? null;

    await db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      action: entry.action,
      resource: entry.resource ?? null,
      resourceId: entry.resourceId ?? null,
      detail: entry.detail ?? null,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Audit logging must never break the request
    console.error("[audit] Failed to write audit log:", error);
  }
}
