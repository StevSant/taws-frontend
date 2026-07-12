import { Signal } from '../domain';
import { SignalDto } from './signal-dto';

/** Maps a `SignalDto` (snake_case wire shape) to the domain `Signal`. */
export function mapSignalDto(dto: SignalDto): Signal {
  return {
    id: dto.id,
    instrumentSymbol: dto.instrument_symbol,
    impactClass: dto.impact_class,
    confidence: dto.confidence,
    priceDelta: dto.price_delta ?? undefined,
    createdAt: dto.created_at,
    thesis: dto.thesis?.trim() || undefined,
    keyDrivers: dto.key_drivers ?? [],
    riskFactors: dto.risk_factors ?? [],
    analysisAvailable: dto.analysis_available ?? true,
    disclaimer: dto.disclaimer,
  };
}
