import { describe, it, expect } from "vitest";
import nextConfig, { securityHeaders } from "../../next.config";

function headerValue(key: string): string {
  const h = securityHeaders.find((x) => x.key === key);
  if (!h) throw new Error(`Header not found: ${key}`);
  return h.value;
}

describe("security headers", () => {
  it("declares every required header", () => {
    const keys = securityHeaders.map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "Content-Security-Policy",
      ])
    );
  });

  it("HSTS has max-age and includeSubDomains but not preload", () => {
    const v = headerValue("Strict-Transport-Security");
    expect(v).toMatch(/max-age=\d+/);
    expect(v).toContain("includeSubDomains");
    expect(v).not.toContain("preload");
  });

  it("X-Frame-Options is DENY", () => {
    expect(headerValue("X-Frame-Options")).toBe("DENY");
  });

  it("X-Content-Type-Options is nosniff", () => {
    expect(headerValue("X-Content-Type-Options")).toBe("nosniff");
  });

  it("Referrer-Policy is strict-origin-when-cross-origin", () => {
    expect(headerValue("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("Permissions-Policy locks down camera, microphone, geolocation", () => {
    const v = headerValue("Permissions-Policy");
    expect(v).toContain("camera=()");
    expect(v).toContain("microphone=()");
    expect(v).toContain("geolocation=()");
  });

  describe("Content-Security-Policy", () => {
    const csp = headerValue("Content-Security-Policy");

    it.each([
      ["default-src 'self'"],
      ["frame-ancestors 'none'"],
      ["object-src 'none'"],
      ["base-uri 'self'"],
      ["form-action 'self'"],
    ])("includes %s", (directive) => {
      expect(csp).toContain(directive);
    });

    it("allowlists Plaid for script, frame, connect, and img", () => {
      expect(csp).toMatch(/script-src[^;]*https:\/\/cdn\.plaid\.com/);
      expect(csp).toMatch(/frame-src[^;]*https:\/\/cdn\.plaid\.com/);
      expect(csp).toMatch(/connect-src[^;]*https:\/\/\*\.plaid\.com/);
      expect(csp).toMatch(/img-src[^;]*https:\/\/\*\.plaid\.com/);
    });

    it("does not allow 'unsafe-eval'", () => {
      expect(csp).not.toContain("unsafe-eval");
    });

    it("does not allowlist origins we no longer use", () => {
      expect(csp).not.toContain("accounts.google.com");
      expect(csp).not.toContain("api.telegram.org");
    });
  });

  it("nextConfig.headers() applies headers to every path", async () => {
    const headers = await nextConfig.headers!();
    expect(headers).toHaveLength(1);
    expect(headers[0].source).toBe("/:path*");
    expect(headers[0].headers).toEqual(securityHeaders);
  });
});
