import { EnrichedInstrument, InstrumentHighlights, InstrumentPage } from '../domain';
import {
  EnrichedInstrumentDto,
  InstrumentHighlightsDto,
  InstrumentPageDto,
} from './enriched-instrument-dto';
import { mapSignalDto } from './map-signal-dto';

/** Maps an `EnrichedInstrumentDto` (snake_case wire shape) to the domain model. */
export function mapEnrichedInstrumentDto(dto: EnrichedInstrumentDto): EnrichedInstrument {
  return {
    symbol: dto.symbol,
    name: dto.name,
    assetClass: dto.asset_class,
    currency: dto.currency,
    lastPrice: dto.last_price,
    priceDeltaPct: dto.price_delta_pct,
    volatilityPct: dto.volatility_pct,
    volatilityRegime: dto.volatility_regime,
    sparkline: Array.isArray(dto.sparkline) ? dto.sparkline : [],
    latestSignal: dto.latest_signal ? mapSignalDto(dto.latest_signal) : null,
  };
}

function mapHighlights(dto: InstrumentHighlightsDto): InstrumentHighlights {
  return {
    topGainers: (dto.top_gainers ?? []).map(mapEnrichedInstrumentDto),
    topLosers: (dto.top_losers ?? []).map(mapEnrichedInstrumentDto),
    mostVolatile: (dto.most_volatile ?? []).map(mapEnrichedInstrumentDto),
    trending: (dto.trending ?? []).map(mapEnrichedInstrumentDto),
  };
}

/** Maps an `InstrumentPageDto` to the domain `InstrumentPage`. */
export function mapInstrumentPageDto(dto: InstrumentPageDto): InstrumentPage {
  return {
    items: (dto.items ?? []).map(mapEnrichedInstrumentDto),
    total: dto.total,
    page: dto.page,
    pageSize: dto.page_size,
    highlights: mapHighlights(dto.highlights),
  };
}
