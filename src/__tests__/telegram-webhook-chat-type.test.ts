import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────
const insertValues = vi.fn();
const onConflictDoUpdate = vi.fn();
const updateWhere = vi.fn();
const updateSet = vi.fn(() => ({ where: updateWhere }));
const selectLimit = vi.fn();
const selectWhere = vi.fn(() => ({ limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: updateSet })),
    select: vi.fn(() => ({ from: selectFrom })),
  },
}));

// api-helpers (withErrorHandling) imports ./auth, which pulls next-auth into the
// test environment; the webhook itself never authenticates a session.
vi.mock("@/lib/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));

vi.mock("@/lib/telegram", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 5 }),
  recordFailure: vi.fn().mockResolvedValue({ remaining: 4 }),
  resetAttempts: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/validation", () => ({ timingSafeCompare: () => true }));

const getDailySummary = vi.fn().mockResolvedValue("You spent $123.45 at Acme Corp today.");
vi.mock("@/lib/alerts", () => ({ getDailySummary }));

import { POST } from "@/app/api/telegram/webhook/route";
import { sendTelegramMessage } from "@/lib/telegram";
import { db } from "@/db";

const mockedSend = vi.mocked(sendTelegramMessage);
const mockedInsert = vi.mocked(db.insert);
const mockedUpdate = vi.mocked(db.update);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_WEBHOOK_SECRET = "test-secret";
  insertValues.mockReturnValue({ onConflictDoUpdate });
  onConflictDoUpdate.mockResolvedValue(undefined);
  updateWhere.mockResolvedValue(undefined);
  updateSet.mockReturnValue({ where: updateWhere });
  selectFrom.mockReturnValue({ where: selectWhere });
  selectWhere.mockReturnValue({ limit: selectLimit });
  selectLimit.mockResolvedValue([{ userId: "victim-user", chatId: "-100999", enabled: true }]);
  getDailySummary.mockResolvedValue("You spent $123.45 at Acme Corp today.");
});

function hook(text: string, chatType: string | undefined, chatId = -100999) {
  return new NextRequest("https://app.example.com/api/telegram/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": "test-secret",
    },
    body: JSON.stringify({
      message: {
        chat: chatType === undefined ? { id: chatId } : { id: chatId, type: chatType },
        text,
        from: { id: 4242, first_name: "Attacker" },
      },
    }),
  });
}

const sentText = () => mockedSend.mock.calls.map((c) => String(c[1])).join("\n");

describe("telegram webhook — private chats only (#155)", () => {
  // The leak this closes: the bot replies INTO the chat that asked, so in a group
  // every member receives the summary of whichever account is bound, whoever typed
  // the command. Sender identity is irrelevant to that, which is why the fix
  // declines to act in a group rather than authenticating the sender.
  for (const type of ["group", "supergroup", "channel"]) {
    it(`does not serve /summary in a ${type} chat`, async () => {
      const res = await POST(hook("/summary", type));
      expect(res.status).toBe(200);
      expect(getDailySummary).not.toHaveBeenCalled();
      expect(sentText()).not.toContain("Acme Corp");
      expect(sentText()).not.toContain("123.45");
      expect(sentText()).toContain("direct message");
    });
  }

  it("does not bind an account from a group chat", async () => {
    const res = await POST(hook("/start SOMECODE", "group"));
    expect(res.status).toBe(200);
    expect(mockedUpdate).not.toHaveBeenCalled(); // link token never consumed
    expect(mockedInsert).not.toHaveBeenCalled(); // no telegram_configs row
  });

  it("does not let a group chat pause another account's alerts", async () => {
    await POST(hook("/pause", "group"));
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("fails closed when chat.type is absent", async () => {
    const res = await POST(hook("/summary", undefined));
    expect(res.status).toBe(200);
    expect(getDailySummary).not.toHaveBeenCalled();
    expect(sentText()).not.toContain("Acme Corp");
  });

  it("still serves /summary in a private chat", async () => {
    const res = await POST(hook("/summary", "private", 4242));
    expect(res.status).toBe(200);
    expect(getDailySummary).toHaveBeenCalledWith("victim-user");
    expect(sentText()).toContain("Acme Corp");
  });
});
