import { ChartSpec } from '../../../../shared/charts';
import { AgentTrace } from './agent-trace.model';
import { ToolCall } from './tool-call.model';

/**
 * Discriminated union of everything the SSE-v2 wire protocol can emit for a
 * single assistant turn. See SseChatRepository (infrastructure/) for the
 * frame-to-event mapping.
 */
export type ChatStreamEvent =
  | { kind: 'token'; text: string }
  | { kind: 'trace'; trace: AgentTrace }
  | { kind: 'tool'; tool: ToolCall }
  | { kind: 'chart'; chart: ChartSpec }
  | { kind: 'error'; message: string };
