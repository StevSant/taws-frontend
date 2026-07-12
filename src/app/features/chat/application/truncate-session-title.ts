const SESSION_TITLE_MAX_LENGTH = 24;
const DEFAULT_TITLE_KEY = '__new__';

/** Keeps sidebar titles short and single-line friendly. */
export function truncateSessionTitle(title: string): string {
  if (title === DEFAULT_TITLE_KEY) {
    return title;
  }

  const normalized = title.trim().replace(/\s+/g, ' ');
  if (normalized.length <= SESSION_TITLE_MAX_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, SESSION_TITLE_MAX_LENGTH)}…`;
}
