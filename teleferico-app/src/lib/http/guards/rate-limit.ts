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
