import { Injectable, inject } from '@angular/core';
import { AppConfigService } from '../../../core';
import { TextToSpeechProvider } from '../domain';
import { HttpTtsProvider } from './http-tts.provider';
import { WebSpeechTtsProvider } from './web-speech-tts.provider';

/**
 * Composite TextToSpeechProvider that implements the hybrid strategy so the
 * application store depends only on the port:
 *
 * - `ttsEnabled` → try the server HTTP provider first; if it throws (e.g. a
 *   503 when TTS is misconfigured, or a network/playback error), transparently
 *   fall back to the browser Web Speech provider.
 * - `!ttsEnabled` → use the Web Speech provider directly, without calling the
 *   server endpoint just to receive a 503.
 *
 * Bound via `{ provide: TextToSpeechProvider, useClass: HybridTextToSpeechProvider }`.
 */
@Injectable()
export class HybridTextToSpeechProvider extends TextToSpeechProvider {
  private readonly config = inject(AppConfigService);
  private readonly httpProvider = inject(HttpTtsProvider);
  private readonly webSpeechProvider = inject(WebSpeechTtsProvider);

  async speak(text: string): Promise<void> {
    if (!this.config.ttsEnabled) {
      await this.webSpeechProvider.speak(text);
      return;
    }

    try {
      await this.httpProvider.speak(text);
    } catch {
      await this.webSpeechProvider.speak(text);
    }
  }

  stop(): void {
    this.httpProvider.stop();
    this.webSpeechProvider.stop();
  }
}
