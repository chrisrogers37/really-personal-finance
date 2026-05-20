import { describe, it, expect } from "vitest";
import { evaluateGate, type GateInput } from "@/lib/middleware-gate";

function gate(overrides: Partial<GateInput> = {}) {
  return evaluateGate({
    pathname: "/dashboard",
    isLoggedIn: true,
    mfaEnabled: false,
    mfaVerifiedAt: null,
    ...overrides,
  });
}

describe("evaluateGate — existing behavior", () => {
  it("passes cron routes through", () => {
    expect(gate({ pathname: "/api/cron/sync-transactions", isLoggedIn: false }))
      .toEqual({ type: "next" });
  });

  it("passes telegram routes through", () => {
    expect(gate({ pathname: "/api/telegram/webhook", isLoggedIn: false }))
      .toEqual({ type: "next" });
  });

  it("redirects unauthenticated dashboard hits to /auth/signin", () => {
    expect(gate({ isLoggedIn: false })).toEqual({
      type: "redirect",
      path: "/auth/signin",
    });
  });

  it("returns 401 JSON for unauthenticated /api/admin/*", () => {
    expect(gate({ pathname: "/api/admin/users", isLoggedIn: false })).toEqual({
      type: "json",
      status: 401,
      body: { error: "Unauthorized" },
    });
  });

  it("redirects logged-in users away from /auth/signin", () => {
    expect(gate({ pathname: "/auth/signin" })).toEqual({
      type: "redirect",
      path: "/dashboard",
    });
  });
});

describe("evaluateGate — MFA enforcement", () => {
  it("redirects dashboard to /auth/mfa when MFA enabled but unverified", () => {
    expect(gate({ mfaEnabled: true, mfaVerifiedAt: null })).toEqual({
      type: "redirect",
      path: "/auth/mfa",
    });
  });

  it("redirects profile to /auth/mfa when MFA enabled but unverified", () => {
    expect(
      gate({ pathname: "/profile", mfaEnabled: true, mfaVerifiedAt: null }),
    ).toEqual({ type: "redirect", path: "/auth/mfa" });
  });

  it("returns 401 JSON for /api/admin/* when MFA enabled but unverified", () => {
    expect(
      gate({
        pathname: "/api/admin/users",
        mfaEnabled: true,
        mfaVerifiedAt: null,
      }),
    ).toEqual({
      type: "json",
      status: 401,
      body: { error: "MFA required" },
    });
  });

  it("allows /auth/mfa itself through so the user can verify", () => {
    expect(
      gate({ pathname: "/auth/mfa", mfaEnabled: true, mfaVerifiedAt: null }),
    ).toEqual({ type: "next" });
  });

  it("does NOT redirect away from /auth/mfa for logged-in users", () => {
    // existing /auth/* redirect rule must not bounce the MFA page back to /dashboard
    expect(gate({ pathname: "/auth/mfa", mfaEnabled: false })).toEqual({
      type: "next",
    });
  });

  it("passes when MFA is verified", () => {
    expect(gate({ mfaEnabled: true, mfaVerifiedAt: new Date() })).toEqual({
      type: "next",
    });
  });

  it("passes when MFA is not enabled", () => {
    expect(gate({ mfaEnabled: false, mfaVerifiedAt: null })).toEqual({
      type: "next",
    });
  });

  it("treats string-form mfaVerifiedAt (JSON-serialized) as verified", () => {
    expect(
      gate({ mfaEnabled: true, mfaVerifiedAt: new Date().toISOString() }),
    ).toEqual({ type: "next" });
  });
});
