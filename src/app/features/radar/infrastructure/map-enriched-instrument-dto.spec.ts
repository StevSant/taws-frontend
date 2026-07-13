import { describe, expect, it } from 'vitest';
import { EnrichedInstrumentDto } from './enriched-instrument-dto';
import { mapEnrichedInstrumentDto } from './map-enriched-instrument-dto';

/** Minimal valid DTO fixture — enrichment fields are added per test case. */
function buildDto(overrides: Partial<EnrichedInstrumentDto> = {}): EnrichedInstrumentDto {
  return {
    symbol: 'BTC',
    name: 'Bitcoin',
    asset_class: 'crypto',
    currency: 'USD',
    last_price: 50000,
    price_delta_pct: 1.5,
    volatility_pct: 3.2,
    volatility_regime: 'normal',
    sparkline: [1, 2, 3],
    latest_signal: null,
    ...overrides,
  };
}

describe('mapEnrichedInstrumentDto — enrichment fields (Slice 3b)', () => {
  it('maps market_cap, volume_24h and change_7d_pct into the domain model', () => {
    const dto = buildDto({
      market_cap: 950_000_000_000,
      volume_24h: 32_000_000_000,
      change_7d_pct: -4.25,
    });

    const model = mapEnrichedInstrumentDto(dto);

    expect(model.marketCap).toBe(950_000_000_000);
    expect(model.volume24h).toBe(32_000_000_000);
    expect(model.change7dPct).toBe(-4.25);
  });

  it('maps missing enrichment fields to null (null-safe on an older/partial DTO)', () => {
    const dto = buildDto();

    const model = mapEnrichedInstrumentDto(dto);

    expect(model.marketCap).toBeNull();
    expect(model.volume24h).toBeNull();
    expect(model.change7dPct).toBeNull();
  });

  it('maps explicit null enrichment fields to null', () => {
    const dto = buildDto({ market_cap: null, volume_24h: null, change_7d_pct: null });

    const model = mapEnrichedInstrumentDto(dto);

    expect(model.marketCap).toBeNull();
    expect(model.volume24h).toBeNull();
    expect(model.change7dPct).toBeNull();
  });

  it('leaves the existing 10 fields unchanged', () => {
    const dto = buildDto({ market_cap: 1, volume_24h: 2, change_7d_pct: 3 });

    const model = mapEnrichedInstrumentDto(dto);

    expect(model).toMatchObject({
      symbol: 'BTC',
      name: 'Bitcoin',
      assetClass: 'crypto',
      currency: 'USD',
      lastPrice: 50000,
      priceDeltaPct: 1.5,
      volatilityPct: 3.2,
      volatilityRegime: 'normal',
      sparkline: [1, 2, 3],
      latestSignal: null,
    });
  });
});
