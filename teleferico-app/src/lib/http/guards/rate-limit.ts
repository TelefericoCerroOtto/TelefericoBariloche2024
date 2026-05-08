type RateEntry = {
  hits: number;
  reset: number;
};

export type LimitStore = Map<string, RateEntry>;

export function isRateLimited(
  ip: string,
  store: LimitStore,
  maxHits: number,
  windowMs: number,
) {
  // Prevent memory leaks by capping the store size.
  // If we reach 10,000 IPs in a 24h window, clear it out.
  // This is a naive but effective protection against OOM from IP spoofing.
  if (store.size > 10000) {
    store.clear();
  }

  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || entry.reset <= now) {
    store.set(ip, { hits: 1, reset: now + windowMs });
    return false;
  }
  entry.hits += 1;
  if (entry.hits > maxHits) {
    return true;
  }
  return false;
}
