export type ToolCallEventKind = 'start' | 'done';

export interface ToolCall {
  agent: string;
  name: string;
  event: ToolCallEventKind;
}

export type ToolHopStatus = 'active' | 'done';

export interface ToolHop {
  agent: string;
  name: string;
  status: ToolHopStatus;
}

export interface ToolHopSnapshot {
  name: string;
  status: ToolHopStatus;
}
