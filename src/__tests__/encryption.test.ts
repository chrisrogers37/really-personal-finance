import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock the environment variable before importing the module
describe("encryption", () => {
  const VALID_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", VALID_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("encrypts and decrypts a string correctly (round-trip)", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const plaintext = "access-sandbox-abc123-def456";
    const ciphertext = encrypt(plaintext);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const plaintext = "same-text";
    const cipher1 = encrypt(plaintext);
    const cipher2 = encrypt(plaintext);
    expect(cipher1).not.toBe(cipher2);
  });

  it("ciphertext has expected format: iv:authTag:encrypted", async () => {
    const { encrypt } = await import("@/lib/encryption");
    const ciphertext = encrypt("test");
    const parts = ciphertext.split(":");
    expect(parts).toHaveLength(3);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Auth tag is 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
    // Encrypted data is non-empty
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const ciphertext = encrypt("secret");
    const parts = ciphertext.split(":");
    // Tamper with encrypted data
    const tampered = `${parts[0]}:${parts[1]}:${"ff".repeat(parts[2].length / 2)}`;
    expect(() => decrypt(tampered)).toThrow();
  });

  it("handles empty string", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const ciphertext = encrypt("");
    expect(decrypt(ciphertext)).toBe("");
  });

  it("handles unicode text", async () => {
    const { encrypt, decrypt } = await import("@/lib/encryption");
    const plaintext = "Hello, World!";
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe(plaintext);
  });

  it("throws when ENCRYPTION_KEY is missing", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "");
    // Need fresh import to pick up new env
    const mod = await import("@/lib/encryption");
    expect(() => mod.encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string"
    );
  });

  it("throws when ENCRYPTION_KEY is wrong length", async () => {
    vi.stubEnv("ENCRYPTION_KEY", "tooshort");
    const mod = await import("@/lib/encryption");
    expect(() => mod.encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string"
    );
  });
});
