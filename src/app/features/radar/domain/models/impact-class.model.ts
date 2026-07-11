/**
 * The Analyst agent's classification of a news item's impact on an
 * instrument. Mirrors the backend's `ImpactClass` StrEnum
 * (`domain/signals/entities/impact_class.py`), returned by
 * `GET /api/v1/signals`.
 */
export type ImpactClass = 'positive' | 'negative' | 'neutral' | 'uncertain';
