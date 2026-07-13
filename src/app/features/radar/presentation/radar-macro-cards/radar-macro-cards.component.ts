import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { FearGreedArcGaugeComponent } from '../../../../shared';
import { FearGreedClassification, MacroState, MarketPulse } from '../../domain';

/** Rendered in place of a delta/percentage the API returned as null (thin/absent series). */
const MISSING_VALUE = '—';

const CLASSIFICATION_KEYS: Record<FearGreedClassification, TranslationKey> = {
  extreme_fear: 'radar.macro.fearGreed.extremeFear',
  fear: 'radar.macro.fearGreed.fear',
  neutral: 'radar.macro.fearGreed.neutral',
  greed: 'radar.macro.fearGreed.greed',
  extreme_greed: 'radar.macro.fearGreed.extremeGreed',
};

const SCALE_ZONES: readonly FearGreedClassification[] = [
  'extreme_fear',
  'fear',
  'neutral',
  'greed',
  'extreme_greed',
];

@Component({
  selector: 'app-radar-macro-cards',
  standalone: true,
  imports: [DecimalPipe, FearGreedArcGaugeComponent],
  templateUrl: './radar-macro-cards.component.html',
  styleUrl: './radar-macro-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarMacroCardsComponent {
  @Input() macro: MacroState | null = null;
  @Input() marketPulse: MarketPulse | null = null;

  readonly scaleZones = SCALE_ZONES;

  constructor(readonly i18n: TranslationService) {}

  classificationLabel(classification: FearGreedClassification): string {
    return this.i18n.t(CLASSIFICATION_KEYS[classification]);
  }

  deltaLabel(delta: number | null | undefined): string {
    if (delta === null || delta === undefined || Number.isNaN(delta)) {
      return MISSING_VALUE;
    }
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(0)}`;
  }

  strongestIndex(): MarketPulse['indices'][number] | null {
    const indices = this.marketPulse?.indices ?? [];
    return (
      [...indices].sort((left, right) => Math.abs(right.changePct) - Math.abs(left.changePct))[0] ??
      null
    );
  }

  percentageLabel(value: number | null | undefined): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return MISSING_VALUE;
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }
}
