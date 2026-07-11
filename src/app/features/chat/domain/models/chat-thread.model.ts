import { ChatMessage } from './chat-message.model';

/**
 * A conversation thread: an ordered list of messages plus streaming state.
 */
export interface ChatThread {
  id: string;
  messages: ChatMessage[];
  isStreaming: boolean;
}
