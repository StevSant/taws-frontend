import { Injectable, inject } from '@angular/core';
import { AppConfigService, AuthTokenService } from '../../../core';
import { TextToSpeechProvider } from '../domain';
import { splitSpeechChunks } from './split-speech-chunks';

const SPEAK_PATH = '/api/v1/chat/speak';

/**
 * Infrastructure adapter for TextToSpeechProvider backed by the server TTS endpoint.
 *
 * To keep time-to-first-audio low, the text is split into sentence-sized chunks
 * (`splitSpeechChunks`) and synthesized in a PIPELINE: while chunk N plays, chunk N+1 is
 * already being fetched from `{apiBaseUrl}/api/v1/chat/speak`. Only the first (short) chunk's
 * synthesis is on the critical path, so a long reply starts speaking almost immediately
 * instead of after the whole message renders. Each chunk plays via its own `HTMLAudioElement`
 * (plain audio, no MediaSource), and its object URL is revoked when it ends.
 *
 * This is a DI singleton, so a rapid `stop()`→`speak()` (which `AudioPlaybackStore.play()`
 * does when switching messages) runs two `speak()` calls against the same instance. Each call
 * gets a private `token`; every checkpoint bails the moment `activeToken` no longer points at
 * it, and the shared `abortController` is only cleared/aborted by the call that still owns it —
 * so a superseded call can never play a stray chunk or null out the newer call's controller.
 *
 * On a non-OK response BEFORE any audio has played (e.g. 503 when TTS is unconfigured) it
 * THROWS so AudioPlaybackStore can transparently fall back to the Web Speech adapter. A
 * failure MID-playback stops gracefully instead of replaying the whole message in the
 * fallback voice. `stop()` aborts in-flight synthesis and resolves (never a failure).
 */
@Injectable()
export class HttpTtsProvider extends TextToSpeechProvider {
  private readonly config = inject(AppConfigService);
  private readonly authToken = inject(AuthTokenService);

  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private resolveActive: (() => void) | null = null;
  /** Identifies the in-flight `speak()` call; a newer call or `stop()` replaces it. */
  private activeToken: symbol | null = null;
  private abortController: AbortController | null = null;

  async speak(text: string): Promise<void> {
    const chunks = splitSpeechChunks(text);
    if (chunks.length === 0) {
      return;
    }

    const token = Symbol('tts-session');
    this.activeToken = token;
    const controller = new AbortController();
    this.abortController = controller;
    const { signal } = controller;
    const superseded = (): boolean => this.activeToken !== token;

    // Fetch the first chunk, then pipeline: kick off chunk N+1's synthesis before awaiting
    // chunk N's playback, so synthesis overlaps playback and only the first chunk is on the
    // critical path to first audio.
    let pending: Promise<Blob> | null = this.fetchClip(chunks[0], signal);
    let played = 0;
    try {
      for (let i = 0; i < chunks.length; i++) {
        let blob: Blob;
        try {
          blob = await pending!;
        } catch (error: unknown) {
          if (superseded()) {
            return; // stopped or replaced by a newer speak() — a cancel, not a failure
          }
          if (played === 0) {
            throw error; // nothing spoken yet — let the store fall back to Web Speech
          }
          return; // already speaking — stop cleanly rather than replay via the fallback
        }
        if (superseded()) {
          return;
        }

        pending = i + 1 < chunks.length ? this.fetchClip(chunks[i + 1], signal) : null;
        await this.playClip(blob, token);
        played += 1;
        if (superseded()) {
          return;
        }
      }
    } finally {
      // Don't leak an abandoned prefetch (e.g. on cancel) as an unhandled rejection.
      pending?.catch(() => undefined);
      // Only clear the shared controller if this call still owns it — a newer speak() may
      // have already replaced it, and nulling that would break its stop().
      if (this.abortController === controller) {
        this.abortController = null;
      }
    }
  }

  stop(): void {
    this.activeToken = null;
    this.abortController?.abort();
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    const resolve = this.resolveActive;
    this.cleanup();
    // Resolve (not reject) a user-initiated stop so it isn't treated as a playback failure
    // that would trigger a fallback.
    resolve?.();
  }

  private async fetchClip(text: string, signal: AbortSignal): Promise<Blob> {
    const response = await fetch(`${this.config.apiBaseUrl}${SPEAK_PATH}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({ text }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`TTS request failed with status ${response.status}`);
    }

    return response.blob();
  }

  private playClip(blob: Blob, token: symbol): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      this.currentAudio = audio;
      this.currentObjectUrl = objectUrl;
      this.resolveActive = resolve;

      // Guard against a stale clip's late event clobbering a newer clip's shared state: only
      // clean up if this audio is still the active one AND this call still owns the session.
      const finish = () => {
        if (this.currentAudio === audio && this.activeToken === token) {
          this.cleanup();
        }
      };

      audio.onended = () => {
        finish();
        resolve();
      };
      audio.onerror = () => {
        finish();
        reject(new Error('TTS audio playback failed'));
      };

      void audio.play().catch((error: unknown) => {
        finish();
        reject(error instanceof Error ? error : new Error('TTS audio playback failed'));
      });
    });
  }

  private cleanup(): void {
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    this.currentAudio = null;
    this.resolveActive = null;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = this.authToken.currentToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }
}
