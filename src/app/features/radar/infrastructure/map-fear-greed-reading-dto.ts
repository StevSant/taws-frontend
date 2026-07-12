import {
  FearGreedClassification,
  FearGreedReading,
} from '../domain/models/fear-greed-reading.model';
import { FearGreedReadingDto } from './fear-greed-reading-dto';

const CLASSIFICATIONS = new Set<FearGreedClassification>([
  'extreme_fear',
  'fear',
  'neutral',
  'greed',
  'extreme_greed',
]);

export function mapFearGreedReadingDto(dto: FearGreedReadingDto): FearGreedReading {
  const classification = CLASSIFICATIONS.has(dto.classification as FearGreedClassification)
    ? (dto.classification as FearGreedClassification)
    : 'neutral';

  return {
    value: dto.value,
    classification,
    asOf: new Date(dto.as_of),
  };
}
