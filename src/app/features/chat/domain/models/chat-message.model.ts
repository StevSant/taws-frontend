import { ChartSpec } from '../../../../shared/charts';
import { ToolHopSnapshot } from './tool-call.model';

export type ChatRole = 'user' | 'assistant';

/**
 * A single message in a chat thread. `pending` marks an assistant message that is still
 * receiving streamed tokens. `charts` are rendered below the text, in arrival order;
 * they persist with the message (plain JSON) so a reloaded session re-renders them.
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
  charts?: ChartSpec[];
  /** Specialist that authored the reply (when known). */
  agent?: string;
  /** Tool hops captured during the turn (for transparency after streaming). */
  tools?: ToolHopSnapshot[];
}
