import { ChartSpec } from '../../../../shared/charts';
import { ChatReference } from './chat-reference.model';
import { RoutingHop } from './routing-hop.model';
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
  /** Specialists that participated in the turn (for tags after streaming). */
  routingHops?: RoutingHop[];
  /** Tool hops captured during the turn (for transparency after streaming). */
  tools?: ToolHopSnapshot[];
  /** Market/news the question was grounded on — rendered as a chip on the turn. */
  reference?: ChatReference;
}
