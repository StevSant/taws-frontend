import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { FearGreedArcGaugeComponent } from '../../../../shared';
import { FearGreedClassification, MacroState, MarketPulse } from '../../domain';
import { RadarMacroIndicatorsComponent } from '../radar-macro-indicators/radar-macro-indicators.component';

const CLASSIFICATION_KEYS: Record<FearGreedClassification, TranslationKey> = {
  extreme_fear: 'radar.macro.fearGreed.extremeFear',
  fear: 'radar.macro.fearGreed.fear',
  neutral: 'radar.macro.fearGreed.neutral',
  greed: 'radar.macro.fearGreed.greed',
  extreme_greed: 'radar.macro.fearGreed.extremeGreed',
};

const INSIGHT_KEYS: Record<FearGreedClassification, TranslationKey[]> = {
  extreme_fear: [
    'radar.macro.insight.fear.opportunity',
    'radar.macro.insight.fear.volatility',
    'radar.macro.insight.fear.contrarian',
  ],
  fear: [
    'radar.macro.insight.fear.opportunity',
    'radar.macro.insight.fear.volatility',
    'radar.macro.insight.fear.contrarian',
  ],
  neutral: [
    'radar.macro.insight.neutral.balance',
    'radar.macro.insight.neutral.watch',
    'radar.macro.insight.neutral.selective',
  ],
  greed: [
    'radar.macro.insight.greed.resilience',
    'radar.macro.insight.greed.risk',
    'radar.macro.insight.greed.discipline',
  ],
  extreme_greed: [
    'radar.macro.insight.greed.resilience',
    'radar.macro.insight.greed.risk',
    'radar.macro.insight.greed.discipline',
  ],
};

const INSIGHT_ICONS = ['📈', '⚠️', '💼'] as const;

export interface MacroInsight {
  icon: string;
  text: string;
}

@Component({
  selector: 'app-radar-macro-cards',
  standalone: true,
  imports: [DecimalPipe, FearGreedArcGaugeComponent, RadarMacroIndicatorsComponent],
  templateUrl: './radar-macro-cards.component.html',
  styleUrl: './radar-macro-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarMacroCardsComponent {
  @Input() macro: MacroState | null = null;
  @Input() marketPulse: MarketPulse | null = null;
  @Input() headlineInsight: string | null = null;

  constructor(readonly i18n: TranslationService) {}

  readonly insights = computed((): MacroInsight[] => {
    const pulse = this.marketPulse;
    if (!pulse) {
      return [];
    }

    const keys = INSIGHT_KEYS[pulse.classification];
    const items: MacroInsight[] = keys.map((key, index) => ({
      icon: INSIGHT_ICONS[index] ?? '•',
      text: this.i18n.t(key),
    }));

    const headline = this.headlineInsight?.trim();
    if (headline) {
      items[2] = { icon: '📰', text: headline };
    }

    return items;
  });

  classificationLabel(classification: FearGreedClassification): string {
    return this.i18n.t(CLASSIFICATION_KEYS[classification]);
  }

  deltaLabel(delta: number): string {
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(0)}`;
  }
}
