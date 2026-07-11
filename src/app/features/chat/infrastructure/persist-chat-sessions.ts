import { ChatSession } from '../domain/models/chat-session.model';

const STORAGE_PREFIX = 'taws.chat.sessions';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}.${userId}`;
}

export function loadChatSessions(userId: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ChatSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChatSessions(userId: string, sessions: ChatSession[]): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(sessions));
}
