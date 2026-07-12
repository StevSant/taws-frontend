import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  LucideDroplet,
  LucideFileWarning,
  LucideGavel,
  LucidePercent,
  LucideShieldAlert,
  LucideSparkles,
  LucideTrendingDown,
  LucideTrendingUp,
} from '@lucide/angular';
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

/**
 * Preset `eventType` -> lucide icon key, mirroring this file's existing
 * `Record<string, TranslationKey>` lookup-map pattern above. Rendered via the
 * `@switch` in the template. This map only needs to cover the event types the
 * curated seed presets use today — anything unmapped (e.g. a future preset's
 * `eventType`) falls back to `DEFAULT_PRESET_ICON_KEY`.
 */
const PRESET_ICON_KEYS: Record<string, string> = {
  rate_cut: 'trending-down',
  rate_hike: 'trending-up',
  opec_supply_cut: 'droplet',
  geopolitical_conflict: 'shield-alert',
  inflation_surprise: 'percent',
  earnings_miss: 'file-warning',
  regulatory_action: 'gavel',
};

const DEFAULT_PRESET_ICON_KEY = 'sparkles';

@Component({
  selector: 'app-preset-picker',
  standalone: true,
  imports: [
    LucideTrendingDown,
    LucideTrendingUp,
    LucideDroplet,
    LucideShieldAlert,
    LucidePercent,
    LucideFileWarning,
    LucideGavel,
    LucideSparkles,
  ],
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

  /** Lucide icon key for this preset's event type, rendered via the template's `@switch`. */
  presetIcon(preset: ScenarioPreset): string {
    return PRESET_ICON_KEYS[preset.eventType] ?? DEFAULT_PRESET_ICON_KEY;
  }

  onSelect(preset: ScenarioPreset): void {
    this.select.emit(preset.id);
  }
}
