type CacheEntry<T> = {
  data: T;
  updatedAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export const CACHE_TTL_MS = 30_000;

export function getCached<T>(key: string): CacheEntry<T> | null {
  const entry = store.get(key);
  if (!entry) return null;
  return entry as CacheEntry<T>;
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, updatedAt: Date.now() });
}

export function isCacheStale(updatedAt: number, ttlMs = CACHE_TTL_MS): boolean {
  return Date.now() - updatedAt > ttlMs;
}

export function invalidateCache(key: string): void {
  store.delete(key);
}

export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
