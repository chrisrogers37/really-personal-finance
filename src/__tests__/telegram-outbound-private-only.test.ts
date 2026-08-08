import { describe, it, expect, vi, beforeEach } from "vitest";

// The outbound half of #155. The inbound webhook guard reads `chat.type` from
// the incoming update; a scheduled push has no incoming update and no asker to
// authenticate, so it needs a rule decidable from the stored chat_id alone.
//
// These tests drive the REAL sendTelegramMessage and assert against the actual
// HTTP call, so they prove the leak is closed at the wire rather than that a
// mock was not invoked.

// vi.mock is hoisted above the module body, so the mock fns must be too.
const { selectWhere, selectFrom, dbSelect } = vi.hoisted(() => {
  const selectWhere = vi.fn();
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const dbSelect = vi.fn(() => ({ from: selectFrom }));
  return { selectWhere, selectFrom, dbSelect };
});

vi.mock("@/db", () => ({ db: { select: dbSelect } }));

import { sendDailyAlerts } from "@/lib/alerts";

const PRIVATE_CHAT = "4242";      // a user id — positive
const GROUP_CHAT = "-1001234567"; // a supergroup — negative

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/**
 * Drizzle's builder is a thenable that also chains, so the mock has to be both:
 * `await db.select().from().where()` and `.where().groupBy().orderBy().limit(5)`
 * are each used inside the summary path.
 */
function builder<T>(data: T[]) {
  const b: Record<string, unknown> = {
    groupBy: () => b,
    orderBy: () => b,
    limit: () => Promise.resolve(data),
    then: (res: (v: T[]) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(data).then(res, rej),
  };
  return b;
}

/** telegram_configs read, then every transactions aggregate the summary makes. */
function withConfigs(configs: Array<{ userId: string; chatId: string; enabled: boolean }>) {
  let call = 0;
  selectWhere.mockImplementation(() => {
    call += 1;
    if (call === 1) return builder(configs);
    return builder([
      { total: "123.45", count: 2, income: "0", merchant: "Acme Corp", amount: "123.45" },
    ]);
  });
  selectFrom.mockReturnValue({ where: selectWhere });
  dbSelect.mockReturnValue({ from: selectFrom });
}

const sentTo = (chatId: string) =>
  fetchMock.mock.calls.filter(
    (c) => JSON.parse(String((c[1] as RequestInit).body)).chat_id === chatId
  );

const allBodies = () =>
  fetchMock.mock.calls.map((c) => String((c[1] as RequestInit).body)).join("\n");

describe("sendDailyAlerts — private chats only (#155 outbound)", () => {
  it("does NOT push a summary to a group-bound config", async () => {
    withConfigs([{ userId: "victim-user", chatId: GROUP_CHAT, enabled: true }]);
    await sendDailyAlerts();
    expect(sentTo(GROUP_CHAT)).toHaveLength(0);
    expect(allBodies()).not.toContain("Acme Corp");
    expect(allBodies()).not.toContain("123.45");
  });

  it("still pushes to a private-bound config", async () => {
    withConfigs([{ userId: "real-user", chatId: PRIVATE_CHAT, enabled: true }]);
    await sendDailyAlerts();
    expect(sentTo(PRIVATE_CHAT).length).toBeGreaterThan(0);
  });

  it("delivers to the private config while withholding from the group in the same run", async () => {
    withConfigs([
      { userId: "victim-user", chatId: GROUP_CHAT, enabled: true },
      { userId: "real-user", chatId: PRIVATE_CHAT, enabled: true },
    ]);
    await sendDailyAlerts();
    expect(sentTo(GROUP_CHAT)).toHaveLength(0);
    expect(sentTo(PRIVATE_CHAT).length).toBeGreaterThan(0);
  });

  it("fails closed on a malformed chat id", async () => {
    for (const bad of ["", "  ", "not-a-number", "12a34"]) {
      fetchMock.mockClear();
      withConfigs([{ userId: "u", chatId: bad, enabled: true }]);
      await sendDailyAlerts();
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });
});
