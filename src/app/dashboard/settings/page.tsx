"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Trash2,
  Pencil,
  Check,
  X,
  Unlink,
  AlertCircle,
} from "lucide-react";

interface TelegramConfig {
  id: string;
  chatId: string;
  enabled: boolean;
}

interface Account {
  id: string;
  name: string;
  type: string;
  subtype: string | null;
  mask: string | null;
  source: "plaid" | "import" | "manual";
}

export default function SettingsPage() {
  // -- Telegram state --
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | null>(
    null
  );
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [chatIdInput, setChatIdInput] = useState("");
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // -- Accounts state --
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [accountMessage, setAccountMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null
  );

  // -- Fetch Telegram config --
  const fetchTelegramConfig = useCallback(async () => {
    setTelegramLoading(true);
    try {
      const res = await fetch("/api/telegram/config");
      const json = await res.json();
      setTelegramConfig(json.config || null);
      if (json.config) {
        setChatIdInput(json.config.chatId);
      }
    } catch {
      console.error("Failed to fetch Telegram config");
    }
    setTelegramLoading(false);
  }, []);

  // -- Fetch accounts --
  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const json = await res.json();
      setAccounts(json.accounts || []);
    } catch {
      console.error("Failed to fetch accounts");
    }
    setAccountsLoading(false);
  }, []);

  useEffect(() => {
    fetchTelegramConfig();
    fetchAccounts();
  }, [fetchTelegramConfig, fetchAccounts]);

  // -- Telegram handlers --
  async function saveTelegramConfig() {
    setTelegramSaving(true);
    setTelegramMessage(null);
    try {
      const res = await fetch("/api/telegram/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: chatIdInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTelegramMessage({
          type: "error",
          text: json.error || "Failed to save",
        });
      } else {
        setTelegramConfig(json.config);
        setTelegramMessage({ type: "success", text: "Telegram connected!" });
      }
    } catch {
      setTelegramMessage({ type: "error", text: "Network error" });
    }
    setTelegramSaving(false);
  }

  async function toggleTelegramEnabled() {
    if (!telegramConfig) return;
    setTelegramMessage(null);
    try {
      const res = await fetch("/api/telegram/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !telegramConfig.enabled }),
      });
      const json = await res.json();
      if (res.ok) {
        setTelegramConfig(json.config);
        setTelegramMessage({
          type: "success",
          text: json.config.enabled ? "Alerts resumed" : "Alerts paused",
        });
      }
    } catch {
      setTelegramMessage({ type: "error", text: "Network error" });
    }
  }

  async function disconnectTelegram() {
    setTelegramMessage(null);
    try {
      const res = await fetch("/api/telegram/config", { method: "DELETE" });
      if (res.ok) {
        setTelegramConfig(null);
        setChatIdInput("");
        setTelegramMessage({
          type: "success",
          text: "Telegram disconnected",
        });
      }
    } catch {
      setTelegramMessage({ type: "error", text: "Network error" });
    }
  }

  async function testTelegram() {
    setTelegramTesting(true);
    setTelegramMessage(null);
    try {
      const res = await fetch("/api/telegram/test", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setTelegramMessage({
          type: "success",
          text: "Test message sent! Check your Telegram.",
        });
      } else {
        setTelegramMessage({
          type: "error",
          text: json.error || "Test failed",
        });
      }
    } catch {
      setTelegramMessage({ type: "error", text: "Network error" });
    }
    setTelegramTesting(false);
  }

  // -- Account handlers --
  async function renameAccount(id: string) {
    setAccountMessage(null);
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      const json = await res.json();
      if (res.ok) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === id ? { ...a, name: json.account.name } : a))
        );
        setEditingAccountId(null);
        setAccountMessage({ type: "success", text: "Account renamed" });
      } else {
        setAccountMessage({
          type: "error",
          text: json.error || "Failed to rename",
        });
      }
    } catch {
      setAccountMessage({ type: "error", text: "Network error" });
    }
  }

  async function deleteAccount(id: string) {
    const confirmed = window.confirm(
      "Are you sure? This will permanently delete the account and all its transactions."
    );
    if (!confirmed) return;

    setAccountMessage(null);
    setDeletingAccountId(id);
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        setAccountMessage({ type: "success", text: "Account deleted" });
      } else {
        const json = await res.json();
        setAccountMessage({
          type: "error",
          text: json.error || "Failed to delete",
        });
      }
    } catch {
      setAccountMessage({ type: "error", text: "Network error" });
    }
    setDeletingAccountId(null);
  }

  return (
    <div className="space-y-8 animate-fade-in-up max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-foreground-muted">
          Manage your integrations and accounts
        </p>
      </div>

      {/* ── Telegram Setup ── */}
      <section className="bg-background-card backdrop-blur-xl p-6 rounded-2xl border border-border space-y-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-semibold">Telegram Alerts</h2>
        </div>

        <p className="text-sm text-foreground-muted">
          Get daily spending summaries and anomaly alerts via Telegram.
        </p>

        {telegramLoading ? (
          <div className="text-foreground-tertiary text-sm">Loading...</div>
        ) : telegramConfig ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground-muted">Chat ID:</span>
              <code className="text-sm bg-background-elevated px-2 py-1 rounded">
                {telegramConfig.chatId}
              </code>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  telegramConfig.enabled
                    ? "bg-income/20 text-income"
                    : "bg-foreground-tertiary/20 text-foreground-tertiary"
                }`}
              >
                {telegramConfig.enabled ? "Active" : "Paused"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={testTelegram}
                disabled={telegramTesting || !telegramConfig.enabled}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-accent text-foreground rounded-lg hover:bg-accent-hover transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
                {telegramTesting ? "Sending..." : "Send Test Alert"}
              </button>
              <button
                onClick={toggleTelegramEnabled}
                className="px-3 py-2 text-sm font-medium border border-border text-foreground-muted rounded-lg hover:bg-white/5 transition-all duration-150 active:scale-95"
              >
                {telegramConfig.enabled ? "Pause Alerts" : "Resume Alerts"}
              </button>
              <button
                onClick={disconnectTelegram}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-danger/30 text-danger rounded-lg hover:bg-danger/10 transition-all duration-150 active:scale-95"
              >
                <Unlink className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-background-elevated rounded-lg p-4 text-sm text-foreground-muted space-y-2">
              <p className="font-medium text-foreground">How to connect:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Open Telegram and message your bot with{" "}
                  <code className="bg-black/20 px-1 rounded">
                    /start your@email.com
                  </code>
                </li>
                <li>
                  The bot will reply with your chat ID, or you can find it using{" "}
                  <code className="bg-black/20 px-1 rounded">@userinfobot</code>
                </li>
                <li>Enter your chat ID below and save</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatIdInput}
                onChange={(e) => setChatIdInput(e.target.value)}
                placeholder="Enter your Telegram chat ID"
                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background-elevated text-foreground placeholder:text-foreground-tertiary"
              />
              <button
                onClick={saveTelegramConfig}
                disabled={!chatIdInput.trim() || telegramSaving}
                className="px-4 py-2 text-sm font-medium bg-accent text-foreground rounded-lg hover:bg-accent-hover transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {telegramSaving ? "Saving..." : "Connect"}
              </button>
            </div>
          </div>
        )}

        {telegramMessage && (
          <div
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              telegramMessage.type === "success"
                ? "bg-income/10 text-income"
                : "bg-danger/10 text-danger"
            }`}
          >
            {telegramMessage.type === "error" && (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {telegramMessage.text}
          </div>
        )}
      </section>

      {/* ── Account Management ── */}
      <section className="bg-background-card backdrop-blur-xl p-6 rounded-2xl border border-border space-y-4">
        <h2 className="text-lg font-semibold">Accounts</h2>
        <p className="text-sm text-foreground-muted">
          Rename or remove your connected accounts. Deleting an account also
          removes its transactions.
        </p>

        {accountsLoading ? (
          <div className="text-foreground-tertiary text-sm">Loading...</div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-foreground-tertiary">
            No accounts found. Connect a bank or import transactions to get
            started.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between py-3 gap-3"
              >
                <div className="flex-1 min-w-0">
                  {editingAccountId === account.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-border rounded text-sm bg-background-elevated text-foreground"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameAccount(account.id);
                          if (e.key === "Escape") setEditingAccountId(null);
                        }}
                      />
                      <button
                        onClick={() => renameAccount(account.id)}
                        className="p-1 text-income hover:bg-income/10 rounded transition-colors"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingAccountId(null)}
                        className="p-1 text-foreground-muted hover:bg-white/5 rounded transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span className="text-sm font-medium">
                        {account.name}
                      </span>
                      {account.mask && (
                        <span className="text-xs text-foreground-tertiary ml-2">
                          ····{account.mask}
                        </span>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-foreground-tertiary capitalize">
                          {account.type}
                        </span>
                        <span
                          className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            account.source === "plaid"
                              ? "bg-accent/10 text-accent"
                              : "bg-foreground-tertiary/10 text-foreground-tertiary"
                          }`}
                        >
                          {account.source}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {editingAccountId !== account.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingAccountId(account.id);
                        setEditName(account.name);
                      }}
                      className="p-1.5 text-foreground-muted hover:bg-white/5 rounded-lg transition-colors"
                      title="Rename"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteAccount(account.id)}
                      disabled={deletingAccountId === account.id}
                      className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                      title={
                        account.source === "plaid"
                          ? "Unlink Plaid account"
                          : "Delete account"
                      }
                    >
                      {account.source === "plaid" ? (
                        <Unlink className="w-4 h-4" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {accountMessage && (
          <div
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
              accountMessage.type === "success"
                ? "bg-income/10 text-income"
                : "bg-danger/10 text-danger"
            }`}
          >
            {accountMessage.type === "error" && (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {accountMessage.text}
          </div>
        )}
      </section>
    </div>
  );
}
