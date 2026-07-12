import { Injectable, inject } from '@angular/core';
import { AppConfigService, AuthTokenService } from '../../../core';
import { TextToSpeechProvider } from '../domain';

const SPEAK_PATH = '/api/v1/chat/speak';

/**
 * Infrastructure adapter for TextToSpeechProvider backed by the server TTS
 * endpoint. POSTs the text to `{apiBaseUrl}/api/v1/chat/speak` with `fetch`
 * (mirroring SseChatRepository's auth-header handling), reads the returned
 * `audio/mpeg` blob, and plays it via an `HTMLAudioElement`.
 *
 * On a non-OK response (including 503 when TTS is unconfigured) it THROWS so
 * AudioPlaybackStore can transparently fall back to the Web Speech adapter.
 * The object URL is always revoked on end/error/stop to avoid leaks.
 */
@Injectable()
export class HttpTtsProvider extends TextToSpeechProvider {
  private readonly config = inject(AppConfigService);
  private readonly authToken = inject(AuthTokenService);

  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private resolveActive: (() => void) | null = null;

  async speak(text: string): Promise<void> {
    const response = await fetch(`${this.config.apiBaseUrl}${SPEAK_PATH}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`TTS request failed with status ${response.status}`);
    }

    const blob = await response.blob();
    await this.playBlob(blob);
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    const resolve = this.resolveActive;
    this.cleanup();
    // Resolve (not reject) a user-initiated stop so it isn't treated as a
    // playback failure that would trigger a fallback.
    resolve?.();
  }

  private playBlob(blob: Blob): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      this.currentAudio = audio;
      this.currentObjectUrl = objectUrl;
      this.resolveActive = resolve;

      audio.onended = () => {
        this.cleanup();
        resolve();
      };
      audio.onerror = () => {
        this.cleanup();
        reject(new Error('TTS audio playback failed'));
      };

      void audio.play().catch((error: unknown) => {
        this.cleanup();
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
