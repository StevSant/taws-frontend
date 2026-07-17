import { ScenarioMonitorSnapshot } from '../domain';

/** Caps the match-reason length so the bell dropdown stays a single readable line. */
const MAX_REASON_LENGTH = 140;

function truncate(text: string, max = MAX_REASON_LENGTH): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Builds the bell notification body for a materializing scenario: the scenario `title`
 * followed by the watchdog's `matchReason` when present (`"Fed hikes 50bp — AAPL moved
 * +6.2% …"`), falling back to just the title when no reason was recorded. The `⚡` headline
 * itself lives in the `notifications.scenario.matched` translation key, not here.
 */
export function formatScenarioMatchDetail(monitor: ScenarioMonitorSnapshot): string {
  const title = monitor.title.trim();
  const reason = monitor.matchReason?.trim();
  return reason ? `${title} — ${truncate(reason)}` : title;
}
