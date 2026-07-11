import { RequestCacheService } from './request-cache.service';

/** Returns a cached value when fresh; otherwise runs `fetcher` and stores the result. */
export async function cachedFetch<T>(
  cache: RequestCacheService,
  namespace: string,
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = cache.get<T>(namespace, key);
  if (cached !== null) {
    return cached;
  }

  const value = await fetcher();
  cache.set(namespace, key, value, ttlMs);
  return value;
}
