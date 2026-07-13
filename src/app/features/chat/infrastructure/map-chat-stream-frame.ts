import { ChatStreamEvent } from '../domain';
import { mapChatCitationDto } from './map-chat-citation-dto';
import { ChatStreamFrame } from './chat-stream-frame';

export function mapChatStreamFrame(frame: ChatStreamFrame): ChatStreamEvent | null {
  if (frame.done) return null;
  if (frame.error !== undefined) return { kind: 'error', message: frame.error };
  if (frame.trace !== undefined) return { kind: 'trace', trace: frame.trace };
  if (frame.tool !== undefined) return { kind: 'tool', tool: frame.tool };
  if (frame.chart !== undefined) return { kind: 'chart', chart: frame.chart };
  if (frame.citations !== undefined) {
    return { kind: 'citations', citations: frame.citations.map(mapChatCitationDto) };
  }
  if (frame.t !== undefined) return { kind: 'token', text: frame.t };
  return null;
}
