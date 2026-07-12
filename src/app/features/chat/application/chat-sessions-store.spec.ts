import { beforeEach, describe, expect, it } from 'vitest';
import { ChartSpec } from '../../../shared/charts';
import { ChatSession } from '../domain/models/chat-session.model';
import { ChatSessionsStore } from './chat-sessions-store';

const TEST_CHART: ChartSpec = {
  type: 'line',
  series: [{ name: 'AAPL', points: [{ x: '2026-01-01', y: 190 }], bars: [] }],
  xAxis: { label: 'Date', type: 'time' },
  yAxis: { label: 'Price', type: 'value', format: 'currency' },
  meta: {
    title: 'AAPL price',
    source: 'test',
    timeframe: '1m',
    timeframes: [],
    request: { kind: 'price_line', symbols: ['AAPL'], timeframe: '1m' },
  },
};

describe('ChatSessionsStore', () => {
  const userId = 'history-user';
  const storageKey = `taws.chat.sessions.${userId}`;
  let store: ChatSessionsStore;

  beforeEach(() => {
    localStorage.clear();
    const session: ChatSession = {
      id: 'session-1',
      title: 'Existing chat',
      messages: [{ id: 'old', role: 'user', content: 'Earlier message' }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    localStorage.setItem(storageKey, JSON.stringify([session]));
    store = new ChatSessionsStore();
    store.bootstrap(userId);
    store.resolveSessionRoute(session.id);
  });

  it('appends realtime messages to the active session and persists charts', () => {
    store.appendActiveMessages([
      { id: 'voice-user', role: 'user', content: 'Show me Apple' },
      {
        id: 'voice-assistant',
        role: 'assistant',
        content: 'Here is Apple',
        charts: [TEST_CHART],
        pending: true,
      },
    ]);

    expect(store.activeMessages().map((message) => message.id)).toEqual([
      'old',
      'voice-user',
      'voice-assistant',
    ]);
    expect(store.activeMessages().at(-1)).toMatchObject({
      content: 'Here is Apple',
      charts: [TEST_CHART],
      pending: false,
    });

    const persisted = JSON.parse(localStorage.getItem(storageKey) ?? '[]') as ChatSession[];
    expect(persisted[0].messages.map((message) => message.id)).toEqual([
      'old',
      'voice-user',
      'voice-assistant',
    ]);
    expect(persisted[0].messages.at(-1)?.charts).toEqual([TEST_CHART]);
  });
});
