interface TimedCacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** In-memory TTL map used by `RequestCacheService`. */
export class TimedCache<T> {
  private readonly entries = new Map<string, TimedCacheEntry<T>>();

  get(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
