import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("sendTelegramMessage", () => {
  const MOCK_TOKEN = "123456:ABC-DEF";

  beforeEach(() => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", MOCK_TOKEN);
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends a message with correct URL and body", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTelegramMessage } = await import("@/lib/telegram");
    await sendTelegramMessage("12345", "Hello!");

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.telegram.org/bot${MOCK_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: "12345",
          text: "Hello!",
          parse_mode: "HTML",
        }),
      }
    );
  });

  it("returns true on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(""),
      })
    );

    const { sendTelegramMessage } = await import("@/lib/telegram");
    const result = await sendTelegramMessage("12345", "test");
    expect(result).toBe(true);
  });

  it("returns false on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("Bad Request"),
      })
    );

    const { sendTelegramMessage } = await import("@/lib/telegram");
    const result = await sendTelegramMessage("12345", "test");
    expect(result).toBe(false);
  });

  it("uses Markdown parse mode when specified", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { sendTelegramMessage } = await import("@/lib/telegram");
    await sendTelegramMessage("12345", "**bold**", "Markdown");

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.parse_mode).toBe("Markdown");
  });

  it("throws when TELEGRAM_BOT_TOKEN is missing", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const { sendTelegramMessage } = await import("@/lib/telegram");
    await expect(sendTelegramMessage("12345", "test")).rejects.toThrow(
      "TELEGRAM_BOT_TOKEN is not set"
    );
  });
});
