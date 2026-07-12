/** Target maximum characters per speech chunk. Small enough that the FIRST chunk's
 * synthesis is short (fast time-to-first-audio), large enough to avoid choppy playback
 * and a request per tiny fragment. ~140 chars ≈ one to two spoken sentences. */
const MAX_CHUNK_CHARS = 140;

/**
 * Splits text into speech-sized chunks for pipelined TTS playback.
 *
 * The server `/speak` endpoint synthesizes the WHOLE input before returning, so speaking a
 * long reply in one call means several seconds of silence while it renders. Splitting on
 * sentence boundaries lets the caller synthesize + play the first (short) chunk almost
 * immediately and render the rest in the background — the first chunk's length is the only
 * thing on the critical path to first audio.
 *
 * Sentences are detected on `.!?…` (and hard line breaks), then greedily packed up to
 * `maxChars`. A single sentence longer than `maxChars` is hard-wrapped at word boundaries so
 * no chunk is ever oversized. Whitespace-only input yields no chunks.
 */
export function splitSpeechChunks(text: string, maxChars: number = MAX_CHUNK_CHARS): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [];
  }

  const sentences = normalized
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    for (const piece of hardWrap(sentence, maxChars)) {
      if (!current) {
        current = piece;
      } else if (current.length + 1 + piece.length <= maxChars) {
        current = `${current} ${piece}`;
      } else {
        chunks.push(current);
        current = piece;
      }
    }
  }

  if (current) {
    chunks.push(current);
  }
  return chunks;
}

/** Splits an over-long sentence so no piece exceeds `maxChars`. Breaks at word boundaries
 * first; a single word that is itself longer than `maxChars` (a long URL, hash, or
 * non-space-delimited script) is hard-sliced by codepoint so no chunk is ever oversized. */
function hardWrap(sentence: string, maxChars: number): string[] {
  if (sentence.length <= maxChars) {
    return [sentence];
  }

  const pieces: string[] = [];
  let current = '';
  for (const word of sentence.split(/\s+/)) {
    for (const token of splitLongToken(word, maxChars)) {
      if (!current) {
        current = token;
      } else if (current.length + 1 + token.length <= maxChars) {
        current = `${current} ${token}`;
      } else {
        pieces.push(current);
        current = token;
      }
    }
  }
  if (current) {
    pieces.push(current);
  }
  return pieces;
}

/** Hard-slices a single token longer than `maxChars` at codepoint boundaries (so surrogate
 * pairs / emoji are never split mid-character). Returns `[token]` unchanged when it fits. */
function splitLongToken(token: string, maxChars: number): string[] {
  const codepoints = Array.from(token);
  if (codepoints.length <= maxChars) {
    return [token];
  }

  const pieces: string[] = [];
  for (let start = 0; start < codepoints.length; start += maxChars) {
    pieces.push(codepoints.slice(start, start + maxChars).join(''));
  }
  return pieces;
}
