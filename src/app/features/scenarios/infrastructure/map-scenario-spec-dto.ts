import { ScenarioSpec } from '../domain';
import { ScenarioSpecDto } from './scenario-spec-dto';

/** Maps a `ScenarioSpecDto` (snake_case wire shape) to the domain `ScenarioSpec`. */
export function mapScenarioSpecDto(dto: ScenarioSpecDto): ScenarioSpec {
  return {
    entity: dto.entity,
    eventType: dto.event_type,
    magnitude: dto.magnitude,
    horizon: dto.horizon,
    title: dto.title,
    description: dto.description,
    affectedSymbols: dto.affected_symbols,
    affectedAssetClasses: dto.affected_asset_classes,
    presetId: dto.preset_id,
  };
}
