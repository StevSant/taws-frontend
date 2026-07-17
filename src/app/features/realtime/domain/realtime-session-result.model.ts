import { RealtimeTurn } from './realtime-turn.model';

/**
 * The outcome of one realtime voice session: the completed turns plus the server
 * `conversation_id` the backend minted for it (null when the deployment's session endpoint
 * did not return one). The chat page binds the persisted turns to this conversation so a
 * refresh rehydrates them from `GET /chat/conversations/{id}`.
 */
export interface RealtimeSessionResult {
  conversationId: string | null;
  turns: readonly RealtimeTurn[];
}
