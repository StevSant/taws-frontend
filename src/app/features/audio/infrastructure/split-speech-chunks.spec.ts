import { describe, expect, it } from 'vitest';
import { splitSpeechChunks } from './split-speech-chunks';

describe('splitSpeechChunks', () => {
  it('returns no chunks for empty or whitespace-only input', () => {
    expect(splitSpeechChunks('')).toEqual([]);
    expect(splitSpeechChunks('   \n  ')).toEqual([]);
  });

  it('keeps a single short sentence as one chunk', () => {
    expect(splitSpeechChunks('Hello world')).toEqual(['Hello world']);
  });

  it('splits on sentence boundaries when merging would exceed the max', () => {
    const text = 'First sentence here. Second one follows! And a third?';
    expect(splitSpeechChunks(text, 30)).toEqual([
      'First sentence here.',
      'Second one follows!',
      'And a third?',
    ]);
  });

  it('greedily merges short sentences up to the max length', () => {
    // "One. Two." = 9 chars fits under 12; adding " Three." would exceed it -> new chunk.
    expect(splitSpeechChunks('One. Two. Three. Four.', 12)).toEqual(['One. Two.', 'Three. Four.']);
  });

  it('hard-wraps a single sentence longer than the max at word boundaries', () => {
    const chunks = splitSpeechChunks('alpha beta gamma delta epsilon', 11);
    expect(chunks).toEqual(['alpha beta', 'gamma delta', 'epsilon']);
    expect(chunks.every((chunk) => chunk.length <= 11)).toBe(true);
  });

  it('breaks on hard line breaks even without sentence punctuation', () => {
    expect(splitSpeechChunks('line one\nline two', 10)).toEqual(['line one', 'line two']);
  });

  it('character-slices a single unbroken token longer than the max (URL/hash/CJK)', () => {
    const chunks = splitSpeechChunks('x'.repeat(300), 50);
    expect(chunks.length).toBe(6);
    expect(chunks.every((chunk) => chunk.length <= 50)).toBe(true);
    expect(chunks.join('')).toBe('x'.repeat(300)); // no text dropped
  });

  it('never emits a chunk longer than maxChars for mixed prose + a long token', () => {
    const text = `See ${'z'.repeat(400)} now. A short tail here.`;
    const chunks = splitSpeechChunks(text, 60);
    expect(chunks.every((chunk) => chunk.length <= 60)).toBe(true);
  });
});
