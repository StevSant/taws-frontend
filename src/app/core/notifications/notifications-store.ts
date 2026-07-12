import { Injectable, computed, signal } from '@angular/core';
import { TranslationKey } from '../i18n';
import { Notification, NotificationSource } from './notification.model';

/** Caps the in-memory list so a long-lived session/tab can't grow it unbounded. */
const MAX_NOTIFICATIONS = 50;

/**
 * Signal-based, app-wide (root-provided) store for in-app notifications —
 * the bell dropdown in `ShellComponent`. Deliberately simple for T2 scope:
 * in-memory only (cleared on reload), no backend-persisted read-state.
 *
 * Feeds: `RadarStore`'s auto-refresh polling (new signals) and
 * `BriefingPanelStore`'s on-demand generation (new briefing) both call
 * `notify(...)` directly — see their `constructor`s. Kept in `core/` rather
 * than `features/` because it's cross-cutting infrastructure other features
 * hook into, not a page of its own (same reasoning as `core/auth`).
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  private readonly notificationsSignal = signal<Notification[]>([]);

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly count = computed(() => this.notificationsSignal().length);

  /** Pushes a new notification onto the top of the list. */
  notify(source: NotificationSource, messageKey: TranslationKey, count = 1, detail?: string): void {
    const notification: Notification = {
      id: this.generateId(),
      source,
      messageKey,
      count,
      detail,
      createdAt: new Date().toISOString(),
    };
    this.notificationsSignal.update((current) =>
      [notification, ...current].slice(0, MAX_NOTIFICATIONS),
    );
  }

  /** Dismisses a single notification by id. */
  dismiss(id: string): void {
    this.notificationsSignal.update((current) => current.filter((item) => item.id !== id));
  }

  /** Dismisses every notification. */
  clearAll(): void {
    this.notificationsSignal.set([]);
  }

  private generateId(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
