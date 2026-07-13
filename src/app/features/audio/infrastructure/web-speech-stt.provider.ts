import { Injectable } from '@angular/core';
import { DictationError, SpeechToTextProvider } from '../domain';

/**
 * Minimal structural types for the Web Speech Recognition API, which is not in
 * the standard DOM lib typings. Only the members this adapter uses are modelled.
 */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/**
 * Infrastructure adapter for SpeechToTextProvider backed by the browser's
 * built-in Web Speech Recognition API (`SpeechRecognition` /
 * `webkitSpeechRecognition`). Used as the fallback when the server STT endpoint
 * is unavailable (503) or STT is disabled, so a user can still dictate without
 * a network round-trip.
 *
 * Honest support: this API is effectively Chrome-only — `supported` is false in
 * Firefox/Safari, letting the composer hide the mic when no path works.
 */
@Injectable()
export class WebSpeechSttProvider extends SpeechToTextProvider {
  private recognition: SpeechRecognitionLike | null = null;
  private transcript = '';

  get supported(): boolean {
    return this.recognitionCtor() !== null;
  }

  start(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const Ctor = this.recognitionCtor();
      if (!Ctor) {
        reject(new DictationError('unsupported', 'Web Speech Recognition API is not available'));
        return;
      }

      this.transcript = '';
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = false;
      this.recognition = recognition;

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let text = '';
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0]?.transcript ?? '';
        }
        this.transcript = text;
      };

      recognition.start();
      resolve();
    });
  }

  stop(): Promise<string> {
    const recognition = this.recognition;
    if (!recognition) {
      return Promise.reject(new Error('Dictation was not started'));
    }

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      recognition.onerror = (event: { error?: string }) => {
        if (settled) {
          return;
        }
        settled = true;
        this.recognition = null;
        const code = event.error ?? 'unknown';
        // 'not-allowed'/'service-not-allowed' mean the browser blocked mic access
        // for recognition — classify as a permission failure; anything else stays generic.
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          reject(new DictationError('permission-denied', 'Microphone permission was denied'));
          return;
        }
        reject(new Error(`Web Speech recognition failed: ${code}`));
      };
      recognition.onend = () => {
        if (settled) {
          return;
        }
        settled = true;
        this.recognition = null;
        resolve(this.transcript.trim());
      };
      recognition.stop();
    });
  }

  cancel(): void {
    this.recognition?.abort();
    this.recognition = null;
    this.transcript = '';
  }

  private recognitionCtor(): SpeechRecognitionCtor | null {
    const scope = globalThis as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
  }
}
