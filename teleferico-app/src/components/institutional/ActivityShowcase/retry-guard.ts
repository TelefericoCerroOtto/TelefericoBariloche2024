export function createRetryGuard(options?: {
  cooldownMs?: number; // mínimo entre clicks
  windowMs?: number; // ventana para contar clicks
  maxInWindow?: number; // máximo en esa ventana
}) {
  const cooldownMs = options?.cooldownMs ?? 1500;
  const windowMs = options?.windowMs ?? 60_000;
  const maxInWindow = options?.maxInWindow ?? 5;

  let lastAt = 0;
  let attempts: number[] = [];

  return function canRetry(now = Date.now()) {
    // cooldown
    if (now - lastAt < cooldownMs)
      return { ok: false, reason: "cooldown" as const };

    // sliding window
    attempts = attempts.filter((t) => now - t < windowMs);
    if (attempts.length >= maxInWindow) {
      return { ok: false, reason: "rate" as const };
    }

    lastAt = now;
    attempts.push(now);
    return { ok: true as const };
  };
}
