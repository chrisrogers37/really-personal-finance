"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SyncStatus {
  hasPlaidAccounts: boolean;
  lastSyncedAt: string | null;
  transactionCount: number;
}

export function SyncStatusBanner() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/sync/status");
      const json = await res.json();
      setStatus(json);
    } catch {
      console.error("Failed to fetch sync status");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function triggerSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/sync/trigger", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setSyncResult({
          type: "success",
          text: `Synced: ${json.added} new, ${json.modified} updated`,
        });
        fetchStatus();
      } else {
        setSyncResult({
          type: "error",
          text: json.error || "Sync failed",
        });
      }
    } catch {
      setSyncResult({ type: "error", text: "Network error" });
    }
    setSyncing(false);
  }

  if (loading || !status?.hasPlaidAccounts) return null;

  const lastSyncText = status.lastSyncedAt
    ? `Last synced ${formatDistanceToNow(new Date(status.lastSyncedAt), { addSuffix: true })}`
    : "Not synced yet";

  return (
    <div className="bg-background-card backdrop-blur-xl px-4 py-3 rounded-2xl border border-border flex items-center justify-between gap-3 animate-fade-in">
      <div className="flex items-center gap-3 min-w-0">
        {syncing ? (
          <RefreshCw className="w-4 h-4 text-accent animate-spin shrink-0" />
        ) : status.lastSyncedAt ? (
          <CheckCircle className="w-4 h-4 text-income shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-foreground-tertiary shrink-0" />
        )}
        <div className="text-sm min-w-0">
          <span className="text-foreground-muted">
            {syncing ? "Syncing..." : lastSyncText}
          </span>
          {status.transactionCount > 0 && !syncing && (
            <span className="text-foreground-tertiary ml-2">
              · {status.transactionCount} transactions
            </span>
          )}
          {syncResult && (
            <span
              className={`ml-2 ${
                syncResult.type === "success"
                  ? "text-income"
                  : "text-danger"
              }`}
            >
              · {syncResult.text}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={triggerSync}
        disabled={syncing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border text-foreground-muted rounded-lg hover:bg-black/[0.04] transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
        Sync Now
      </button>
    </div>
  );
}
