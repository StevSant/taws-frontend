/**
 * Shape every locale dictionary must satisfy. To add a new UI string: add the
 * key here first, then a value in every `translations/<locale>.ts` file — the
 * `satisfies TranslationDict` check on each dictionary keeps them in sync at
 * compile time (a missing key fails the build, not just a runtime warning).
 */
export interface TranslationDict {
  'shell.title': string;
  'shell.nav.radar': string;
  'shell.nav.chat': string;
  'shell.nav.scenarios': string;
  'shell.nav.briefings': string;
  'shell.language.es': string;
  'shell.language.en': string;
  'shell.language.toggleLabel': string;
  'chat.placeholder': string;
  'chat.send': string;
  'chat.streaming': string;
  'chat.role.user': string;
  'chat.role.assistant': string;
  'chat.trace.title': string;
  'chat.trace.routing': string;
  'chat.trace.start': string;
  'chat.trace.done': string;
  'chat.error.banner': string;
  'radar.title': string;
  'radar.description': string;
  'scenarios.title': string;
  'scenarios.description': string;
  'briefings.title': string;
  'briefings.description': string;
  'briefings.disclaimer.static': string;
  'briefings.watchlist.label': string;
  'briefings.watchlist.placeholder': string;
  'briefings.watchlist.empty': string;
  'briefings.generate': string;
  'briefings.generating': string;
  'briefings.loading': string;
  'briefings.error.banner': string;
  'briefings.error.retry': string;
  'briefings.selectPrompt': string;
  'briefings.empty.title': string;
  'briefings.empty.description': string;
  'briefings.card.createdAt': string;
  'briefings.card.status.label': string;
  'briefings.card.status.pending': string;
  'briefings.card.linkedSignals.title': string;
  'briefings.card.linkedSignals.empty': string;
  'briefings.card.disclaimer.label': string;
  'briefings.review.decision.reviewed': string;
  'briefings.review.decision.escalated': string;
  'briefings.review.decision.discarded': string;
  'briefings.review.justification.label': string;
  'briefings.review.justification.placeholder': string;
  'briefings.review.action.reviewed': string;
  'briefings.review.action.escalated': string;
  'briefings.review.action.discarded': string;
  'briefings.review.closed': string;
  'briefings.review.error.banner': string;
  'briefings.review.submitting': string;
  'briefings.history.title': string;
  'briefings.history.empty': string;
  'briefings.history.reviewer': string;
  'placeholder.badge': string;
}

/** Union of every valid translation key — used for typed `t()` lookups. */
export type TranslationKey = keyof TranslationDict;
