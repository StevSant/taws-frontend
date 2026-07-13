export { TextToSpeechProvider, SpeechToTextProvider, DictationError } from './domain';
export type { DictationErrorReason } from './domain';
export { AudioPlaybackStore, DictationStore } from './application';
export {
  HttpTtsProvider,
  WebSpeechTtsProvider,
  HybridTextToSpeechProvider,
  HttpSttProvider,
  WebSpeechSttProvider,
  HybridSpeechToTextProvider,
} from './infrastructure';
export { prefersReducedMotion } from './presentation/prefers-reduced-motion';
