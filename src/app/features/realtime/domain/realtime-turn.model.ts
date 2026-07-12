import { ChartSpec } from '../../../shared/charts';

/** A completed conversational turn captured during one realtime voice session. */
export interface RealtimeTurn {
  role: 'user' | 'assistant';
  content: string;
  charts?: ChartSpec[];
}
