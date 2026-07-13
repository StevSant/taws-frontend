import { describe, expect, it } from 'vitest';
import { mapChatStreamFrame } from './map-chat-stream-frame';

describe('mapChatStreamFrame', () => {
  it('maps a structured citations frame', () => {
    const citations = [
      {
        kind: 'news' as const,
        claim: 'Cooling inflation supported BTC.',
        publisher: 'Reuters',
        title: 'Inflation cools',
        url: 'https://example.com/cpi',
        published_at: '2026-07-15T12:00:00Z',
      },
    ];

    expect(mapChatStreamFrame({ citations })).toEqual({
      kind: 'citations',
      citations: [
        {
          kind: 'news',
          claim: 'Cooling inflation supported BTC.',
          publisher: 'Reuters',
          title: 'Inflation cools',
          url: 'https://example.com/cpi',
          publishedAt: '2026-07-15T12:00:00Z',
        },
      ],
    });
  });

  it('maps tokens and ignores done frames', () => {
    expect(mapChatStreamFrame({ t: 'BTC' })).toEqual({ kind: 'token', text: 'BTC' });
    expect(mapChatStreamFrame({ done: true })).toBeNull();
  });
});
