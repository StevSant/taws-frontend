/**
 * Domain port for speech-to-text (voice dictation). An abstract class (not an
 * interface) so it can double as an Angular DI token — bind a concrete adapter
 * via `{ provide: SpeechToTextProvider, useClass: ... }`.
 *
 * Application code (DictationStore) depends on this abstraction only; it never
 * imports the HTTP or Web Speech adapter directly.
 */
export abstract class SpeechToTextProvider {
  /**
   * Begins capturing audio. Resolves once capture has started; rejects if the
   * microphone/recognition could not be started (e.g. permission denied).
   */
  abstract start(): Promise<void>;

  /**
   * Stops capturing and resolves with the transcribed text. Rejects if
   * transcription fails — callers may use a rejection to trigger a fallback
   * provider.
   */
  abstract stop(): Promise<string>;

  /** Aborts any in-progress capture without producing a transcript. */
  abstract cancel(): void;

  /**
   * Whether this provider can run in the current environment (mic + API
   * available). Used to hide the mic affordance when no dictation path works.
   */
  abstract get supported(): boolean;
}
