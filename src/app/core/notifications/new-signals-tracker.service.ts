import { Injectable } from '@angular/core';

/**
 * Shared baseline of news IDs already surfaced to the user. The global shell
 * poller diffs against this to fire bell notifications; the radar page calls
 * `syncBaseline` after a default-filter load so the first global tick does not
 * re-alert the entire initial feed.
 */
@Injectable({ providedIn: 'root' })
export class NewSignalsTracker {
  private lastSeenNewsIds: Set<string> | null = null;

  /** Returns items not seen before; first call only establishes baseline. */
  detectNew<T extends { id: string }>(items: T[]): T[] {
    const currentIds = new Set(items.map((item) => item.id));

    if (this.lastSeenNewsIds === null) {
      this.lastSeenNewsIds = currentIds;
      return [];
    }

    const fresh = items.filter((item) => !this.lastSeenNewsIds!.has(item.id));
    this.lastSeenNewsIds = currentIds;
    return fresh;
  }

  /** Re-baseline without emitting notifications (foreground radar load). */
  syncBaseline<T extends { id: string }>(items: T[]): void {
    this.lastSeenNewsIds = new Set(items.map((item) => item.id));
  }
}
