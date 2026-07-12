import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { ImpactClass } from '../../domain';
import { ImpactDistributionSlice } from '../../application/compute-radar-landscape';
import { MarketScore } from '../../application/compute-market-score';

const SLICE_COLORS: Record<ImpactClass | 'unclassified', string> = {
  positive: 'var(--color-gain)',
  negative: 'var(--color-loss)',
  neutral: 'var(--color-text-muted)',
  uncertain: 'var(--color-warn)',
  unclassified: '#cbd5e1',
};

const SLICE_LABELS: Record<ImpactClass | 'unclassified', TranslationKey> = {
  positive: 'radar.landscape.positive',
  negative: 'radar.landscape.negative',
  neutral: 'radar.landscape.neutral',
  uncertain: 'radar.landscape.uncertain',
  unclassified: 'radar.landscape.unclassified',
};

interface PulseSegment {
  key: ImpactClass | 'unclassified';
  count: number;
  pct: number;
  color: string;
  labelKey: TranslationKey;
}

@Component({
  selector: 'app-radar-market-pulse',
  standalone: true,
  templateUrl: './radar-market-pulse.component.html',
  styleUrl: './radar-market-pulse.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarMarketPulseComponent {
  @Input({ required: true }) distribution: ImpactDistributionSlice[] = [];
  @Input({ required: true }) marketScore!: MarketScore;

  constructor(readonly i18n: TranslationService) {}

  get segments(): PulseSegment[] {
    const total = this.marketScore.totalCount;
    if (total === 0) {
      return [];
    }

    const order: (ImpactClass | 'unclassified')[] = [
      'positive',
      'neutral',
      'negative',
      'unclassified',
    ];

    return order
      .map((key) => {
        const slice = this.distribution.find((item) => item.key === key);
        const count = slice?.count ?? 0;
        return {
          key,
          count,
          pct: (count / total) * 100,
          color: SLICE_COLORS[key],
          labelKey: SLICE_LABELS[key],
        };
      })
      .filter((segment) => segment.count > 0);
  }
}
