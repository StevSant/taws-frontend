import { LinkedSignal, SignalImpact } from '../domain';
import { LinkedSignalDto } from './briefing-dto';

/** The impact strings the UI knows how to render; anything else normalizes to 'uncertain'. */
const KNOWN_IMPACTS: readonly SignalImpact[] = ['positive', 'negative', 'neutral', 'uncertain'];

/** Coerces an arbitrary wire `impact` string to a known `SignalImpact`, defaulting to 'uncertain'. */
function normalizeImpact(impact: string): SignalImpact {
  return (KNOWN_IMPACTS as readonly string[]).includes(impact)
    ? (impact as SignalImpact)
    : 'uncertain';
}

/**
 * Maps a `LinkedSignalDto` (snake_case wire shape) to the domain `LinkedSignal`,
 * normalizing an unknown/absent impact to 'uncertain' so the card always has a
 * renderable class.
 */
export function mapLinkedSignalDto(dto: LinkedSignalDto): LinkedSignal {
  return {
    signalId: dto.signal_id,
    symbol: dto.symbol,
    impact: normalizeImpact(dto.impact),
    confidence: dto.confidence,
    title: dto.title,
  };
}
