import { TranslationKey } from '../i18n';

/** Where an in-app notification originated — drives icon/styling if needed later. */
export type NotificationSource = 'radar' | 'briefing' | 'auth';

/** In-app route the bell navigates to when the notification is opened. */
export interface NotificationLink {
  commands: string[];
  queryParams?: Record<string, string>;
}

/**
 * One in-app notification (bell dropdown). In-memory only — no backend
 * persistence, no read/unread state to sync (T2 scope, see
 * `NotificationsStore`).
 *
 * `messageKey` is a translation key, not pre-rendered text: the bell
 * component resolves it via `i18n.t(messageKey)` at render time so a
 * notification created before a language switch still displays correctly
 * after one (mirrors the rest of the app's i18n convention — see
 * `radar-page.component.html`'s `i18n.t(...)` usage).
 */
export interface Notification {
  id: string;
  source: NotificationSource;
  messageKey: TranslationKey;
  /** How many new items this notification represents (e.g. 3 new signals). */
  count: number;
  /**
   * Optional, already-formatted extra context shown alongside `messageKey`
   * (e.g. the instrument symbols behind a batch of new radar signals, such
   * as `"AAPL, TSLA +2 more"`). Pre-formatted rather than a raw list so the
   * producer (e.g. `RadarStore.pollNews`) controls truncation/summarization
   * — the bell dropdown just renders it verbatim.
   */
  detail?: string;
  /** Where to navigate when the user opens this notification. */
  link?: NotificationLink;
  /** ISO-8601 timestamp of when the notification was created. */
  createdAt: string;
}
