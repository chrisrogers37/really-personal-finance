const attempts = new Map<string, { count: number; lockedUntil: number | null }>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
let lastCleanup = Date.now();

function cleanupExpired(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of attempts) {
    if (entry.lockedUntil && entry.lockedUntil <= now) {
      attempts.delete(key);
    }
  }
}

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  cleanupExpired();
  const entry = attempts.get(key);

  if (!entry) {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  if (entry.lockedUntil) {
    const now = Date.now();
    if (now < entry.lockedUntil) {
      return { allowed: false, remaining: 0, retryAfterMs: entry.lockedUntil - now };
    }
    attempts.delete(key);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count };
}

export function recordFailure(key: string): { remaining: number } {
  const entry = attempts.get(key) ?? { count: 0, lockedUntil: null };
  entry.count += 1;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }

  attempts.set(key, entry);
  return { remaining: Math.max(0, MAX_ATTEMPTS - entry.count) };
}

export function resetAttempts(key: string): void {
  attempts.delete(key);
}
