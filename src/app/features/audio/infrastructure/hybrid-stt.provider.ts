import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '../../../core';
import { SpeechToTextProvider } from '../domain';
import { HttpSttProvider } from './http-stt.provider';
import { WebSpeechSttProvider } from './web-speech-stt.provider';

/**
 * Composite SpeechToTextProvider that implements the hybrid strategy so the
 * application store depends only on the port:
 *
 * - `sttEnabled` → capture via the server HTTP provider; if its `stop()` throws
 *   (e.g. a 503 when STT is misconfigured, or a network error), transparently
 *   fall back to a fresh Web Speech capture when that path is supported.
 * - `!sttEnabled` → use the Web Speech provider directly, without POSTing audio
 *   to the server just to receive a 503.
 *
 * Because STT is two-phase (start → stop), the recorded HTTP audio cannot be
 * replayed through Web Speech after an HTTP failure; the fallback therefore
 * re-runs a short fresh Web Speech capture. `supported` reports whether ANY
 * path can run so the composer can hide the mic otherwise.
 *
 * Bound via `{ provide: SpeechToTextProvider, useClass: HybridSpeechToTextProvider }`.
 */
@Injectable()
export class HybridSpeechToTextProvider extends SpeechToTextProvider {
  private readonly config = inject(AppConfigService);
  private readonly httpProvider = inject(HttpSttProvider);
  private readonly webSpeechProvider = inject(WebSpeechSttProvider);

  private usingHttp = false;

  get supported(): boolean {
    if (this.config.sttEnabled) {
      return this.httpProvider.supported || this.webSpeechProvider.supported;
    }
    return this.webSpeechProvider.supported;
  }

  async start(): Promise<void> {
    if (this.config.sttEnabled && this.httpProvider.supported) {
      this.usingHttp = true;
      await this.httpProvider.start();
      return;
    }

    this.usingHttp = false;
    await this.webSpeechProvider.start();
  }

  async stop(): Promise<string> {
    if (!this.usingHttp) {
      return this.webSpeechProvider.stop();
    }

    try {
      return await this.httpProvider.stop();
    } catch (error: unknown) {
      if (!this.webSpeechProvider.supported) {
        throw error;
      }
      // The HTTP recording is unusable; capture a fresh short Web Speech pass.
      await this.webSpeechProvider.start();
      return this.webSpeechProvider.stop();
    } finally {
      this.usingHttp = false;
    }
  }

  cancel(): void {
    this.httpProvider.cancel();
    this.webSpeechProvider.cancel();
    this.usingHttp = false;
  }
}
