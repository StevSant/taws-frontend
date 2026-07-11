export type AgentTraceEvent = 'routing' | 'start' | 'done';

/**
 * One hop in the Supervisor's routing trace, e.g. "Supervisor -> Quant".
 * `detail` is optional free text the backend may attach (reasoning, status).
 */
export interface AgentTrace {
  agent: string;
  event: AgentTraceEvent;
  detail?: string;
}
