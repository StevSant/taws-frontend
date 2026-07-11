import { ScenarioPreset } from '../domain';
import { ScenarioPresetDto } from './scenario-preset-dto';

/** Maps a `ScenarioPresetDto` (snake_case wire shape) to the domain `ScenarioPreset`. */
export function mapScenarioPresetDto(dto: ScenarioPresetDto): ScenarioPreset {
  return {
    id: dto.id,
    titleEs: dto.title_es,
    titleEn: dto.title_en,
    descriptionEs: dto.description_es,
    descriptionEn: dto.description_en,
    entity: dto.entity,
    eventType: dto.event_type,
    magnitude: dto.magnitude,
    horizon: dto.horizon,
    affectedSymbols: dto.affected_symbols,
    affectedAssetClasses: dto.affected_asset_classes,
  };
}
