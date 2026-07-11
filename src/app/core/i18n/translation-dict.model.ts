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
  'placeholder.badge': string;
}

/** Union of every valid translation key — used for typed `t()` lookups. */
export type TranslationKey = keyof TranslationDict;
