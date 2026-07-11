import { Injectable } from '@angular/core';
import { TimedCache } from './timed-cache';

/** Process-wide GET response cache (survives route navigation). */
@Injectable({ providedIn: 'root' })
export class RequestCacheService {
  private readonly namespaces = new Map<string, TimedCache<unknown>>();

  get<T>(namespace: string, key: string): T | null {
    return this.namespace(namespace).get(key) as T | null;
  }

  set<T>(namespace: string, key: string, value: T, ttlMs: number): void {
    this.namespace(namespace).set(key, value, ttlMs);
  }

  delete(namespace: string, key: string): void {
    this.namespace(namespace).delete(key);
  }

  clearNamespace(namespace: string): void {
    this.namespace(namespace).clear();
  }

  private namespace(name: string): TimedCache<unknown> {
    if (!this.namespaces.has(name)) {
      this.namespaces.set(name, new TimedCache());
    }
    return this.namespaces.get(name)!;
  }
}
