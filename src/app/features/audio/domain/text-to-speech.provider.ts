/**
 * Domain port for text-to-speech playback. An abstract class (not an
 * interface) so it can double as an Angular DI token — bind a concrete
 * adapter via `{ provide: TextToSpeechProvider, useClass: ... }`.
 *
 * Application code (AudioPlaybackStore) depends on this abstraction only; it
 * never imports the HTTP or Web Speech adapter directly.
 */
export abstract class TextToSpeechProvider {
  /**
   * Synthesizes and plays `text` as speech. Resolves when playback finishes
   * (or was cancelled). Rejects if synthesis/playback fails — callers may use
   * a rejection to trigger a fallback provider.
   */
  abstract speak(text: string): Promise<void>;

  /** Stops any in-progress playback immediately. Safe to call when idle. */
  abstract stop(): void;
}
