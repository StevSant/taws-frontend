import { Injectable, inject, signal } from '@angular/core';
import { TextToSpeechProvider } from '../domain';

/**
 * Signal-based state + facade for message audio playback. Presentation
 * components read `isPlaying`/`activeMessageId`/`error` and call
 * `play()`/`stop()`; they never touch a TTS adapter directly.
 *
 * Depends only on the `TextToSpeechProvider` port. The hybrid HTTP→Web Speech
 * fallback is handled inside the bound provider (HybridTextToSpeechProvider),
 * so from the store's perspective there is a single `speak()` that resolves on
 * success and rejects on total failure.
 */
@Injectable()
export class AudioPlaybackStore {
  private readonly tts = inject(TextToSpeechProvider);

  private readonly isPlayingSignal = signal(false);
  private readonly activeMessageIdSignal = signal<string | null>(null);
  private readonly errorSignal = signal<string | null>(null);
  private readonly erroredMessageIdSignal = signal<string | null>(null);

  readonly isPlaying = this.isPlayingSignal.asReadonly();
  readonly activeMessageId = this.activeMessageIdSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  /**
   * The message whose playback failed, so the UI can scope the error banner to
   * that exact message instead of assuming it was the latest one.
   */
  readonly erroredMessageId = this.erroredMessageIdSignal.asReadonly();

  /**
   * Plays `text` as the audio for `messageId`. Clicking the message that is
   * already playing toggles playback off. Any in-progress playback for another
   * message is stopped first.
   */
  async play(messageId: string, text: string): Promise<void> {
    if (this.isPlayingSignal() && this.activeMessageIdSignal() === messageId) {
      this.stop();
      return;
    }

    if (this.isPlayingSignal()) {
      this.tts.stop();
    }

    this.errorSignal.set(null);
    this.erroredMessageIdSignal.set(null);
    this.activeMessageIdSignal.set(messageId);
    this.isPlayingSignal.set(true);

    try {
      await this.tts.speak(text);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.erroredMessageIdSignal.set(messageId);
    } finally {
      this.reset();
    }
  }

  stop(): void {
    this.tts.stop();
    this.reset();
  }

  private reset(): void {
    this.isPlayingSignal.set(false);
    this.activeMessageIdSignal.set(null);
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Audio playback failed';
  }
}
