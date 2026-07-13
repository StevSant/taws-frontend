import { DictationErrorReason } from './dictation-error-reason';

/**
 * Error thrown by speech-to-text adapters that carries a classified
 * `DictationErrorReason`. The store reads `reason` to pick a specific localized
 * message; adapters throw this only when they can genuinely tell the cause apart
 * (e.g. a denied mic permission or a 503 from the server endpoint). Any other
 * failure stays a plain `Error` and the store treats it as `'failed'`.
 */
export class DictationError extends Error {
  readonly reason: DictationErrorReason;

  constructor(reason: DictationErrorReason, message: string) {
    super(message);
    this.name = 'DictationError';
    this.reason = reason;
  }
}
