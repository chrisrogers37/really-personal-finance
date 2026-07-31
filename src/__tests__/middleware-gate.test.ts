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

describe("evaluateGate — /api/* default-deny (#111)", () => {
  it("returns 401 for an unauthenticated non-allowlisted API route", () => {
    expect(gate({ pathname: "/api/transactions", isLoggedIn: false })).toEqual({
      type: "json",
      status: 401,
      body: { error: "Unauthorized" },
    });
  });

  it("returns MFA-required 401 for a non-allowlisted API route when unverified", () => {
    expect(
      gate({
        pathname: "/api/transactions",
        mfaEnabled: true,
        mfaVerifiedAt: null,
      }),
    ).toEqual({ type: "json", status: 401, body: { error: "MFA required" } });
  });

  it("passes an authenticated, MFA-verified API request", () => {
    expect(
      gate({
        pathname: "/api/transactions",
        mfaEnabled: true,
        mfaVerifiedAt: new Date(),
      }),
    ).toEqual({ type: "next" });
  });

  it("now gates /api/telegram/config (only /webhook is public)", () => {
    expect(
      gate({ pathname: "/api/telegram/config", isLoggedIn: false }),
    ).toEqual({ type: "json", status: 401, body: { error: "Unauthorized" } });
  });

  it("keeps /api/telegram/webhook public (secret-authed)", () => {
    expect(
      gate({ pathname: "/api/telegram/webhook", isLoggedIn: false }),
    ).toEqual({ type: "next" });
  });

  it("keeps NextAuth routes public so session polling never 401s", () => {
    expect(gate({ pathname: "/api/auth/session", isLoggedIn: false })).toEqual({
      type: "next",
    });
    expect(
      gate({ pathname: "/api/auth/callback/google", isLoggedIn: false }),
    ).toEqual({ type: "next" });
  });

  it("keeps token-based email confirm/revoke routes public", () => {
    expect(
      gate({ pathname: "/api/profile/confirm-email", isLoggedIn: false }),
    ).toEqual({ type: "next" });
    expect(
      gate({ pathname: "/api/profile/revoke-email-change", isLoggedIn: false }),
    ).toEqual({ type: "next" });
  });

  it("gates the authenticated /api/profile route", () => {
    expect(gate({ pathname: "/api/profile", isLoggedIn: false })).toEqual({
      type: "json",
      status: 401,
      body: { error: "Unauthorized" },
    });
  });

  it("keeps cron routes public (secret-authed)", () => {
    expect(
      gate({ pathname: "/api/cron/send-alerts", isLoggedIn: false }),
    ).toEqual({ type: "next" });
  });
});
