import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartSpec } from '../../../shared/charts';
import { ChatMessage, ChatRepository, Conversation, ConversationSummary } from '../domain';
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

const SUMMARY: ConversationSummary = {
  id: 'session-1',
  title: 'Existing chat',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const CONVERSATION: Conversation = {
  ...SUMMARY,
  messages: [{ id: 'old', role: 'user', content: 'Earlier message' }],
};

function buildStore(overrides: Partial<ChatRepository> = {}) {
  const listConversations = vi.fn(() => Promise.resolve<ConversationSummary[]>([SUMMARY]));
  const getConversation = vi.fn((_id: string) => Promise.resolve<Conversation>(CONVERSATION));
  const deleteConversation = vi.fn((_id: string) => Promise.resolve());
  const generateTitle = vi.fn((_messages: readonly ChatMessage[], _threadId: string) =>
    Promise.resolve('Apple outlook'),
  );

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      ChatSessionsStore,
      {
        provide: ChatRepository,
        useValue: {
          streamReply: vi.fn(),
          listConversations,
          getConversation,
          deleteConversation,
          generateTitle,
          ...overrides,
        },
      },
    ],
  });

  return {
    store: TestBed.inject(ChatSessionsStore),
    listConversations,
    getConversation,
    deleteConversation,
    generateTitle,
  };
}

describe('ChatSessionsStore', () => {
  const userId = 'history-user';

  beforeEach(() => {
    localStorage.clear();
  });

  it('loads the session list from the server, not from localStorage', async () => {
    const { store, listConversations } = buildStore();

    await store.bootstrap(userId);

    expect(listConversations).toHaveBeenCalledTimes(1);
    expect(store.sessions().map((session) => session.id)).toEqual(['session-1']);
    expect(store.isReady()).toBe(true);
  });

  it('degrades to an empty sidebar when the list request fails', async () => {
    const { store } = buildStore({
      listConversations: vi.fn(() => Promise.reject(new Error('offline'))),
    });

    await store.bootstrap(userId);

    expect(store.sessions()).toEqual([]);
    expect(store.isReady()).toBe(true);
  });

  it('rehydrates the transcript from the server when a session is opened', async () => {
    const { store, getConversation } = buildStore();
    await store.bootstrap(userId);

    store.resolveSessionRoute('session-1');
    await vi.waitFor(() => expect(store.activeMessages().length).toBe(1));

    expect(getConversation).toHaveBeenCalledWith('session-1');
    expect(store.activeMessages()[0]).toMatchObject({ role: 'user', content: 'Earlier message' });
  });

  it('deletes the conversation on the server', async () => {
    const { store, deleteConversation } = buildStore();
    await store.bootstrap(userId);
    store.resolveSessionRoute('session-1');

    store.deleteSession('session-1');

    expect(deleteConversation).toHaveBeenCalledWith('session-1');
    expect(store.sessions().some((session) => session.id === 'session-1')).toBe(false);
  });

  it('keeps streamed messages in memory without writing to localStorage', async () => {
    const { store } = buildStore();
    await store.bootstrap(userId);
    store.resolveSessionRoute('session-1');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    store.syncActiveMessages([
      { id: 'token-turn', role: 'assistant', content: 'Hel', pending: true },
    ]);
    store.syncActiveMessages([
      { id: 'token-turn', role: 'assistant', content: 'Hello', pending: true },
    ]);

    expect(store.activeMessages()).toEqual([
      { id: 'token-turn', role: 'assistant', content: 'Hello', pending: true },
    ]);
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('appends realtime messages to the active session and keeps their charts', async () => {
    const { store } = buildStore();
    await store.bootstrap(userId);
    store.resolveSessionRoute('session-1');
    await vi.waitFor(() => expect(store.activeMessages().length).toBe(1));

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
  });

  it('asks the backend to title a thread once it has a complete exchange', async () => {
    const { store, generateTitle } = buildStore();
    await store.bootstrap(userId);
    const sessionId = store.createSession();

    store.replaceActiveMessages([
      { id: 'u', role: 'user', content: 'How is AAPL doing?' },
      { id: 'a', role: 'assistant', content: 'Up 2% today.' },
    ]);

    await vi.waitFor(() => expect(generateTitle).toHaveBeenCalledTimes(1));
    expect(generateTitle.mock.calls[0][1]).toBe(sessionId);
    await vi.waitFor(() =>
      expect(store.sessions().find((session) => session.id === sessionId)?.title).toBe(
        'Apple outlook',
      ),
    );
  });
});
