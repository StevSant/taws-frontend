import { RealtimeTurn } from './realtime-turn.model';

/**
 * A single row rendered in the voice-mode transcript: a completed turn, plus an
 * optional `pending` flag marking the assistant turn that is still streaming so
 * the UI can treat it distinctly (muted / italic) until it finalizes.
 */
export type RealtimeTranscriptEntry = RealtimeTurn & { pending?: boolean };
