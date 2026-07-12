import { Injectable, inject, signal } from '@angular/core';
import { SpeechToTextProvider } from '../domain';

/**
 * Signal-based state + facade for voice dictation. Presentation components read
 * `isRecording`/`error`/`isSupported` and call `startDictation()` /
 * `stopDictation()`; they never touch an STT adapter directly.
 *
 * Depends only on the `SpeechToTextProvider` port. The hybrid HTTP→Web Speech
 * fallback is handled inside the bound provider (HybridSpeechToTextProvider),
 * so from the store's perspective there is a single start/stop that yields a
 * transcript on success and surfaces an error on total failure.
 */
@Injectable()
export class DictationStore {
  private readonly stt = inject(SpeechToTextProvider);

  private readonly isRecordingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly isRecording = this.isRecordingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** Whether any dictation path (server STT or Web Speech) can run. */
  isSupported(): boolean {
    return this.stt.supported;
  }

  /** Begins capture. Any prior error is cleared. No-op if already recording. */
  async startDictation(): Promise<void> {
    if (this.isRecordingSignal()) {
      return;
    }

    this.errorSignal.set(null);
    try {
      await this.stt.start();
      this.isRecordingSignal.set(true);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.isRecordingSignal.set(false);
    }
  }

  /**
   * Stops capture and resolves with the transcript. Returns an empty string on
   * failure (with `error` set) or when not currently recording.
   */
  async stopDictation(): Promise<string> {
    if (!this.isRecordingSignal()) {
      return '';
    }

    try {
      const transcript = await this.stt.stop();
      return transcript;
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      return '';
    } finally {
      this.isRecordingSignal.set(false);
    }
  }

  /** Aborts capture without producing a transcript. */
  cancelDictation(): void {
    this.stt.cancel();
    this.isRecordingSignal.set(false);
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Dictation failed';
  }
}
