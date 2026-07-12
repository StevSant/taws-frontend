/**
 * Exact OpenAI Realtime API event type strings used over the `oai-events` data
 * channel. Centralized so the wire vocabulary lives in one place and the
 * transport code reads intent, not string literals.
 *
 * Verified against the OpenAI Realtime API docs (developers.openai.com,
 * 2026-07): WebRTC signaling POSTs the SDP offer to `/v1/realtime/calls`; the
 * model emits `response.function_call_arguments.done` for a completed function
 * call, `response.output_audio_transcript.delta` for streaming transcript, and
 * `response.output_audio.*` frames bracket spoken audio; the client replies
 * with `conversation.item.create` (a `function_call_output` item) followed by
 * `response.create`, and configures the session with `session.update`.
 */
export const OPENAI_REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';

export const OAI_DATA_CHANNEL = 'oai-events';

/** Server -> client event types the transport reacts to. */
export const OAI_EVENT = {
  error: 'error',
  functionCallDone: 'response.function_call_arguments.done',
  transcriptDelta: 'response.output_audio_transcript.delta',
  transcriptDone: 'response.output_audio_transcript.done',
  inputTranscriptDone: 'conversation.item.input_audio_transcription.completed',
  inputSpeechStarted: 'input_audio_buffer.speech_started',
  audioStarted: 'response.output_audio.started',
  audioDone: 'response.output_audio.done',
  responseDone: 'response.done',
} as const;

/** Client -> server event types the transport sends. */
export const OAI_CLIENT_EVENT = {
  sessionUpdate: 'session.update',
  conversationItemCreate: 'conversation.item.create',
  responseCreate: 'response.create',
} as const;
