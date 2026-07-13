import { Injectable, inject } from '@angular/core';
import { AppConfigService, AuthTokenService } from '../../../core';
import { DictationError, SpeechToTextProvider } from '../domain';

const TRANSCRIBE_PATH = '/api/v1/chat/transcribe';
const AUDIO_FILE_NAME = 'dictation.webm';

interface TranscriptionResponse {
  text: string;
}

/**
 * Infrastructure adapter for SpeechToTextProvider backed by the server STT
 * endpoint. Captures microphone audio with `MediaRecorder`, assembles the
 * chunks into a single Blob, and POSTs it as multipart `FormData` to
 * `{apiBaseUrl}/api/v1/chat/transcribe` with `fetch` (mirroring
 * SseChatRepository's/HttpTtsProvider's auth-header handling).
 *
 * On a non-OK response it THROWS a `DictationError` the store maps to a
 * cause-specific hint: 503 (STT unconfigured) → `server-unavailable`, a denied
 * mic prompt → `permission-denied`. There is no runtime replay through Web
 * Speech — two-phase STT can't re-feed already-captured audio to the live
 * recognizer, so the hybrid picks a path at `start()` and a late HTTP failure is
 * surfaced, not retried (see HybridSpeechToTextProvider). The microphone tracks
 * are always released on stop/cancel to free the device.
 */
@Injectable()
export class HttpSttProvider extends SpeechToTextProvider {
  private readonly config = inject(AppConfigService);
  private readonly authToken = inject(AuthTokenService);

  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];

  get supported(): boolean {
    return (
      typeof MediaRecorder !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  async start(): Promise<void> {
    this.chunks = [];
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      // A blocked/dismissed permission prompt rejects with NotAllowedError (or
      // the legacy PermissionDeniedError / SecurityError). Classify it so the UI
      // can tell the user to allow the mic instead of showing a generic failure.
      if (this.isPermissionError(error)) {
        throw new DictationError('permission-denied', 'Microphone permission was denied');
      }
      throw error;
    }
    this.stream = stream;

    try {
      const recorder = new MediaRecorder(stream);
      this.recorder = recorder;
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };
      recorder.start();
    } catch (error) {
      // The mic was already acquired via getUserMedia; if the recorder can't be
      // built or started, release the stream so the device isn't left on, then rethrow.
      this.recorder = null;
      this.releaseStream();
      throw error;
    }
  }

  async stop(): Promise<string> {
    const recorder = this.recorder;
    if (!recorder) {
      this.releaseStream();
      throw new Error('Dictation was not started');
    }

    await this.stopRecorder(recorder);
    const blob = new Blob(this.chunks, { type: recorder.mimeType || 'audio/webm' });
    this.releaseStream();
    this.recorder = null;

    try {
      return await this.transcribe(blob);
    } finally {
      this.chunks = [];
    }
  }

  cancel(): void {
    const recorder = this.recorder;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    this.recorder = null;
    this.chunks = [];
    this.releaseStream();
  }

  private stopRecorder(recorder: MediaRecorder): Promise<void> {
    return new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      if (recorder.state === 'inactive') {
        resolve();
        return;
      }
      recorder.stop();
    });
  }

  private async transcribe(blob: Blob): Promise<string> {
    const form = new FormData();
    form.append('file', blob, AUDIO_FILE_NAME);

    const response = await fetch(`${this.config.apiBaseUrl}${TRANSCRIBE_PATH}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: form,
    });

    if (!response.ok) {
      // 503 is the server's explicit "STT not configured" signal (see the
      // backend /transcribe endpoint); classify it so the UI can say dictation
      // is unavailable rather than blaming speech recognition generically.
      if (response.status === 503) {
        throw new DictationError('server-unavailable', 'Server speech-to-text is not configured');
      }
      throw new Error(`STT request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as TranscriptionResponse;
    return payload.text ?? '';
  }

  private isPermissionError(error: unknown): boolean {
    if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
      return error.name === 'NotAllowedError' || error.name === 'SecurityError';
    }
    // Some browsers throw a plain object/Error whose `name` still carries the code.
    return (
      error instanceof Error &&
      (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
    );
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  private buildHeaders(): Record<string, string> {
    // No Content-Type: the browser sets the multipart boundary for FormData.
    const headers: Record<string, string> = {};
    const token = this.authToken.currentToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }
}
