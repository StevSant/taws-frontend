import { ChatCitation } from '../domain';
import { ChatCitationDto } from './chat-citation-dto';

export function mapChatCitationDto(dto: ChatCitationDto): ChatCitation {
  switch (dto.kind) {
    case 'news':
      return {
        kind: dto.kind,
        claim: dto.claim,
        publisher: dto.publisher,
        title: dto.title,
        url: dto.url,
        publishedAt: dto.published_at,
      };
    case 'signal':
      return {
        kind: dto.kind,
        claim: dto.claim,
        symbol: dto.symbol,
        impact: dto.impact,
        confidence: dto.confidence,
        signalId: dto.signal_id,
      };
    case 'quant':
      return {
        kind: dto.kind,
        claim: dto.claim,
        metric: dto.metric,
        value: dto.value,
        asOf: dto.as_of,
        window: dto.window,
      };
    case 'macro':
      return {
        kind: dto.kind,
        claim: dto.claim,
        indicator: dto.indicator,
        value: dto.value,
        asOf: dto.as_of,
        provider: dto.provider,
      };
  }
}
