import { describe, it, expect, vi, beforeEach } from "vitest";

const selectLimit = vi.fn();
const selectWhere = vi.fn(() => ({ limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));

const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
const txUpdateSet = vi.fn(() => ({ where: txUpdateWhere }));
const txInsertReturning = vi.fn();
const txInsertValues = vi.fn(() => ({ returning: txInsertReturning }));

const txObj = {
  update: vi.fn(() => ({ set: txUpdateSet })),
  insert: vi.fn(() => ({ values: txInsertValues })),
};

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({ from: selectFrom })),
    transaction: vi.fn(async (cb: (tx: typeof txObj) => Promise<unknown>) => cb(txObj)),
  },
}));

import { updateUserProfile } from "@/lib/scd2";

const CURRENT_VERIFIED = new Date("2026-01-01T00:00:00Z");
const CURRENT_ROW = {
  id: "row-1",
  userId: "user-1",
  email: "old@example.com",
  name: "Old Name",
  emailVerified: CURRENT_VERIFIED,
  validFrom: new Date("2026-01-01"),
  isCurrent: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  selectLimit.mockResolvedValue([CURRENT_ROW]);
  selectFrom.mockReturnValue({ where: selectWhere });
  selectWhere.mockReturnValue({ limit: selectLimit });
  txInsertReturning.mockResolvedValue([{ id: "row-2", userId: "user-1" }]);
});

describe("updateUserProfile — emailVerified handling on email swap", () => {
  it("resets emailVerified to null when email changes without explicit override", async () => {
    await updateUserProfile("user-1", { email: "new@example.com" });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        emailVerified: null,
      }),
    );
  });

  it("honors explicit emailVerified when provided alongside email change", async () => {
    const ts = new Date("2026-05-20T12:00:00Z");
    await updateUserProfile("user-1", {
      email: "new@example.com",
      emailVerified: ts,
    });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        emailVerified: ts,
      }),
    );
  });

  it("preserves emailVerified on a name-only update", async () => {
    await updateUserProfile("user-1", { name: "New Name" });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "old@example.com",
        name: "New Name",
        emailVerified: CURRENT_VERIFIED,
      }),
    );
  });

  it("preserves emailVerified when email is passed but unchanged", async () => {
    await updateUserProfile("user-1", { email: "old@example.com" });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "old@example.com",
        emailVerified: CURRENT_VERIFIED,
      }),
    );
  });

  it("honors explicit null emailVerified override", async () => {
    await updateUserProfile("user-1", { emailVerified: null });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerified: null,
      }),
    );
  });
});
