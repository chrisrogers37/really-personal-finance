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

const CURRENT_ROW = {
  id: "row-1",
  userId: "user-1",
  email: "old@example.com",
  name: "Old Name",
  role: "owner",
  emailVerified: new Date("2026-01-01T00:00:00Z"),
  mfaEnabled: true,
  validFrom: new Date("2026-01-01"),
  validTo: null,
  isCurrent: true,
  createdAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  selectLimit.mockResolvedValue([CURRENT_ROW]);
  selectFrom.mockReturnValue({ where: selectWhere });
  selectWhere.mockReturnValue({ limit: selectLimit });
  txInsertReturning.mockResolvedValue([{ id: "row-2", userId: "user-1" }]);
});

describe("updateUserProfile — carries forward versioned columns (#135)", () => {
  it("preserves role and mfaEnabled on a name-only update", async () => {
    await updateUserProfile("user-1", { name: "New Name" });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ role: "owner", mfaEnabled: true, name: "New Name" }),
    );
  });

  it("preserves role and mfaEnabled across an email change", async () => {
    await updateUserProfile("user-1", { email: "new@example.com" });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ role: "owner", mfaEnabled: true, email: "new@example.com" }),
    );
  });

  it("does not carry the old primary key into the new row", async () => {
    await updateUserProfile("user-1", { name: "New Name" });
    expect(txInsertValues).toHaveBeenCalledWith(
      expect.not.objectContaining({ id: expect.anything() }),
    );
  });
});
