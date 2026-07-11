import { AgentTrace } from './agent-trace.model';

/**
 * Discriminated union of everything the SSE-v2 wire protocol can emit for a
 * single assistant turn. See SseChatRepository (infrastructure/) for the
 * frame-to-event mapping.
 */
export type ChatStreamEvent =
  | { kind: 'token'; text: string }
  | { kind: 'trace'; trace: AgentTrace }
  | { kind: 'error'; message: string };
