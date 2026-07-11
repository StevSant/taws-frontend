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
  'radar.filters.type.label': string;
  'radar.filters.type.all': string;
  'radar.filters.asset.label': string;
  'radar.filters.asset.all': string;
  'radar.filters.recency.label': string;
  'radar.filters.recency.24h': string;
  'radar.filters.recency.48h': string;
  'radar.filters.recency.168h': string;
  'radar.filters.recency.720h': string;
  'radar.assetClass.stock': string;
  'radar.assetClass.crypto': string;
  'radar.assetClass.credit': string;
  'radar.assetClass.commodity': string;
  'radar.assetClass.forex': string;
  'radar.loading': string;
  'radar.error.banner': string;
  'radar.error.retry': string;
  'radar.empty.title': string;
  'radar.empty.description': string;
  'radar.unlinked.note': string;
  'radar.card.impact.label': string;
  'radar.card.impact.positive': string;
  'radar.card.impact.negative': string;
  'radar.card.impact.neutral': string;
  'radar.card.impact.uncertain': string;
  'radar.card.impact.unclassified': string;
  'radar.card.confidence.label': string;
  'radar.card.confidence.unavailable': string;
  'radar.card.priceDelta.label': string;
  'radar.card.priceDelta.unavailable': string;
  'radar.card.evidence.title': string;
  'radar.card.disclaimer': string;
  'scenarios.title': string;
  'scenarios.description': string;
  'briefings.title': string;
  'briefings.description': string;
  'placeholder.badge': string;
}

/** Union of every valid translation key — used for typed `t()` lookups. */
export type TranslationKey = keyof TranslationDict;
