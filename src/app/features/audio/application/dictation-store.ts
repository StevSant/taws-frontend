import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { DictationError, DictationErrorReason, SpeechToTextProvider } from '../domain';

const TICK_INTERVAL_MS = 1000;

/**
 * Signal-based state + facade for voice dictation. Presentation components read
 * `isRecording`/`isTranscribing`/`error`/`isSupported` and call
 * `startDictation()` / `stopDictation()`; they never touch an STT adapter directly.
 *
 * Depends only on the `SpeechToTextProvider` port. The hybrid HTTP→Web Speech
 * fallback is handled inside the bound provider (HybridSpeechToTextProvider),
 * so from the store's perspective there is a single start/stop that yields a
 * transcript on success and surfaces an error on total failure.
 *
 * `error` exposes a classified `DictationErrorReason` (never a raw provider
 * message) so the UI can show a cause-specific hint — a denied mic permission
 * reads differently from an unconfigured server endpoint.
 */
@Injectable()
export class DictationStore implements OnDestroy {
  private readonly stt = inject(SpeechToTextProvider);

  private readonly isRecordingSignal = signal(false);
  private readonly isTranscribingSignal = signal(false);
  private readonly errorSignal = signal<DictationErrorReason | null>(null);
  private readonly elapsedSecondsSignal = signal(0);

  private tickHandle: ReturnType<typeof setInterval> | null = null;

  readonly isRecording = this.isRecordingSignal.asReadonly();
  /** True during the async transcription round-trip after recording stops. */
  readonly isTranscribing = this.isTranscribingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  /**
   * Whole seconds captured so far in the current recording, ticking once per second while
   * recording and reset to 0 when it stops. Drives the live "Escuchando… m:ss" status.
   */
  readonly elapsedSeconds = this.elapsedSecondsSignal.asReadonly();

  ngOnDestroy(): void {
    this.stopTimer();
  }

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
      this.startTimer();
    } catch (error: unknown) {
      this.errorSignal.set(this.toReason(error));
      this.isRecordingSignal.set(false);
    }
  }

  /**
   * Stops capture and resolves with the transcript. Returns an empty string on
   * failure (with `error` set) or when not currently recording. Recording flips
   * off immediately and `isTranscribing` covers the transcription round-trip, so
   * the UI can distinguish "listening" from "transcribing".
   */
  async stopDictation(): Promise<string> {
    if (!this.isRecordingSignal()) {
      return '';
    }

    this.isRecordingSignal.set(false);
    this.stopTimer();
    this.isTranscribingSignal.set(true);
    try {
      const transcript = await this.stt.stop();
      return transcript;
    } catch (error: unknown) {
      this.errorSignal.set(this.toReason(error));
      return '';
    } finally {
      this.isTranscribingSignal.set(false);
    }
  }

  /** Aborts capture without producing a transcript. */
  cancelDictation(): void {
    this.stt.cancel();
    this.isRecordingSignal.set(false);
    this.isTranscribingSignal.set(false);
    this.stopTimer();
  }

  /** Starts (or restarts) the once-per-second elapsed counter from zero. */
  private startTimer(): void {
    this.stopTimer();
    const startedAt = Date.now();
    this.elapsedSecondsSignal.set(0);
    // Derive from wall-clock delta rather than incrementing a counter, so a throttled
    // background tab does not undercount the elapsed time it displays.
    this.tickHandle = setInterval(() => {
      this.elapsedSecondsSignal.set(Math.floor((Date.now() - startedAt) / 1000));
    }, TICK_INTERVAL_MS);
  }

  /** Stops the elapsed counter and resets it to zero. */
  private stopTimer(): void {
    if (this.tickHandle !== null) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
    this.elapsedSecondsSignal.set(0);
  }

  private toReason(error: unknown): DictationErrorReason {
    return error instanceof DictationError ? error.reason : 'failed';
  }
}
