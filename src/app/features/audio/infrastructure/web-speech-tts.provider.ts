import { Injectable } from '@angular/core';
import { TextToSpeechProvider } from '../domain';

/**
 * Infrastructure adapter for TextToSpeechProvider backed by the browser's
 * built-in Web Speech API (`window.speechSynthesis`). Used as the fallback
 * when the server TTS endpoint is unavailable (503) or TTS is disabled, so a
 * user can still hear a reply without any network round-trip.
 *
 * `speak()` resolves when the utterance finishes; `stop()` cancels it. If the
 * API is unavailable (unsupported browser), `speak()` rejects so the caller
 * can surface an "unavailable" state.
 */
@Injectable()
export class WebSpeechTtsProvider extends TextToSpeechProvider {
  private resolveActive: (() => void) | null = null;

  speak(text: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const synth = globalThis.speechSynthesis;
      if (!synth || typeof globalThis.SpeechSynthesisUtterance === 'undefined') {
        reject(new Error('Web Speech API is not available'));
        return;
      }

      this.resolveActive = resolve;
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.onend = () => {
        this.resolveActive = null;
        resolve();
      };
      utterance.onerror = () => {
        this.resolveActive = null;
        reject(new Error('Web Speech synthesis failed'));
      };

      synth.speak(utterance);
    });
  }

  stop(): void {
    globalThis.speechSynthesis?.cancel();
    const resolve = this.resolveActive;
    this.resolveActive = null;
    resolve?.();
  }
}
