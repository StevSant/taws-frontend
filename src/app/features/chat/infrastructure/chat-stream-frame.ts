import { ChartSpec } from '../../../shared/charts';
import { AgentTrace, Contribution, ToolCall } from '../domain';
import { ChatCitationDto } from './chat-citation-dto';

export interface ChatStreamFrame {
  t?: string;
  trace?: AgentTrace;
  tool?: ToolCall;
  chart?: ChartSpec;
  citations?: ChatCitationDto[];
  contributions?: Contribution[];
  error?: string;
  done?: boolean;
}
