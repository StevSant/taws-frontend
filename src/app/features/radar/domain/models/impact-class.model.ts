/**
 * The Analyst agent's classification of a news item's impact on an
 * instrument. Mirrors the backend's `ImpactClass` StrEnum
 * (`domain/signals/entities/impact_class.py`).
 *
 * Not yet exposed by any live endpoint — `/api/v1/news` and
 * `/api/v1/instruments` don't return it. Reserved so `RadarSignal` already
 * has the right shape once a `/api/v1/signals`-style endpoint lands (see
 * `domain/signals/ports/signal_repository.py` on the backend, produced by
 * the Analyst agent from issue #2).
 */
export type ImpactClass = 'positive' | 'negative' | 'neutral' | 'uncertain';
