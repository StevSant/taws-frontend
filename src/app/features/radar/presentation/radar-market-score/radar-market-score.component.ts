import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { MarketScore } from '../../application/compute-market-score';

const LABEL_KEYS: Record<MarketScore['label'], TranslationKey> = {
  bullish: 'radar.score.bullish',
  bearish: 'radar.score.bearish',
  neutral: 'radar.score.neutral',
};

@Component({
  selector: 'app-radar-market-score',
  standalone: true,
  templateUrl: './radar-market-score.component.html',
  styleUrl: './radar-market-score.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarMarketScoreComponent {
  @Input({ required: true }) marketScore!: MarketScore;

  constructor(readonly i18n: TranslationService) {}

  labelKey(): TranslationKey {
    return LABEL_KEYS[this.marketScore.label];
  }

  scoreGradient(): string {
    const score = this.marketScore.score;
    const filled = (score / 100) * 360;
    const color =
      this.marketScore.label === 'bullish'
        ? 'var(--color-gain)'
        : this.marketScore.label === 'bearish'
          ? 'var(--color-loss)'
          : 'var(--color-warn)';
    return `conic-gradient(${color} 0deg ${filled}deg, var(--color-border) ${filled}deg 360deg)`;
  }
}
