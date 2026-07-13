import { describe, expect, it } from 'vitest';
import { mapConversationMessagesDto } from './map-conversation-messages-dto';

describe('mapConversationMessagesDto citations', () => {
  it('rehydrates persisted citations on assistant messages', () => {
    const citations = [
      {
        kind: 'quant' as const,
        claim: 'BTC returned -33%.',
        metric: 'six-month normalized return',
        value: '-33%',
        as_of: '2026-07-15',
      },
    ];

    const messages = mapConversationMessagesDto([
      { role: 'assistant', content: 'BTC performed better.', citations },
    ]);

    expect(messages[0]?.citations).toEqual([
      {
        kind: 'quant',
        claim: 'BTC returned -33%.',
        metric: 'six-month normalized return',
        value: '-33%',
        asOf: '2026-07-15',
        window: undefined,
      },
    ]);
  });
});
