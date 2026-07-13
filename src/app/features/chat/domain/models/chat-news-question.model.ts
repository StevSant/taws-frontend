import { ChatReference } from './chat-reference.model';

/**
 * Emitted by the chat context rail when the user taps "Preguntar a Midas" on a
 * news item: the prefilled prompt text plus the structured reference to attach,
 * so the chip shows and the answer is grounded on that article (issue #73).
 */
export interface ChatNewsQuestion {
  prompt: string;
  reference: ChatReference;
}
