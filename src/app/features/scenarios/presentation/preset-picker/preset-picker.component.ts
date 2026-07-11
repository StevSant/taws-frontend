import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { ScenarioPreset } from '../../domain';

const MAGNITUDE_LABELS: Record<string, TranslationKey> = {
  low: 'scenarios.magnitude.low',
  medium: 'scenarios.magnitude.medium',
  high: 'scenarios.magnitude.high',
};

const HORIZON_LABELS: Record<string, TranslationKey> = {
  immediate: 'scenarios.horizon.immediate',
  short_term: 'scenarios.horizon.short_term',
  medium_term: 'scenarios.horizon.medium_term',
  long_term: 'scenarios.horizon.long_term',
};

const ASSET_CLASS_LABELS: Record<string, TranslationKey> = {
  stock: 'scenarios.assetClass.stock',
  crypto: 'scenarios.assetClass.crypto',
  credit: 'scenarios.assetClass.credit',
  commodity: 'scenarios.assetClass.commodity',
  forex: 'scenarios.assetClass.forex',
};

@Component({
  selector: 'app-preset-picker',
  standalone: true,
  templateUrl: './preset-picker.component.html',
  styleUrl: './preset-picker.component.scss',
})
export class PresetPickerComponent {
  @Input({ required: true }) presets: ScenarioPreset[] = [];
  @Input() selectedId: string | null = null;
  @Output() select = new EventEmitter<string>();

  constructor(readonly i18n: TranslationService) {}

  title(preset: ScenarioPreset): string {
    return this.i18n.locale() === 'en' ? preset.titleEn : preset.titleEs;
  }

  description(preset: ScenarioPreset): string {
    return this.i18n.locale() === 'en' ? preset.descriptionEn : preset.descriptionEs;
  }

  magnitudeLabel(magnitude: string): string {
    const key = MAGNITUDE_LABELS[magnitude];
    return key ? this.i18n.t(key) : magnitude;
  }

  horizonLabel(horizon: string): string {
    const key = HORIZON_LABELS[horizon];
    return key ? this.i18n.t(key) : horizon;
  }

  assetClassLabel(assetClass: string): string {
    const key = ASSET_CLASS_LABELS[assetClass];
    return key ? this.i18n.t(key) : assetClass;
  }

  onSelect(preset: ScenarioPreset): void {
    this.select.emit(preset.id);
  }
}
