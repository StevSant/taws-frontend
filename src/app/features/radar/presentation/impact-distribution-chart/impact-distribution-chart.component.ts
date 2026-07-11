import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { ImpactClass } from '../../domain';
import { ImpactDistributionSlice } from '../../application/compute-radar-landscape';

const SLICE_COLORS: Record<ImpactClass | 'unclassified', string> = {
  positive: 'var(--color-gain)',
  negative: 'var(--color-loss)',
  neutral: 'var(--color-text-muted)',
  uncertain: 'var(--color-warn)',
  unclassified: 'var(--color-gold)',
};

const SLICE_LABELS: Record<ImpactClass | 'unclassified', TranslationKey> = {
  positive: 'radar.landscape.positive',
  negative: 'radar.landscape.negative',
  neutral: 'radar.landscape.neutral',
  uncertain: 'radar.landscape.uncertain',
  unclassified: 'radar.landscape.unclassified',
};

export interface ImpactSegment {
  key: ImpactClass | 'unclassified';
  count: number;
  pct: number;
  color: string;
  labelKey: TranslationKey;
}

@Component({
  selector: 'app-impact-distribution-chart',
  standalone: true,
  templateUrl: './impact-distribution-chart.component.html',
  styleUrl: './impact-distribution-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpactDistributionChartComponent {
  @Input({ required: true }) distribution: ImpactDistributionSlice[] = [];
  @Input() total = 0;

  constructor(readonly i18n: TranslationService) {}

  get segments(): ImpactSegment[] {
    const total = this.total || this.distribution.reduce((sum, slice) => sum + slice.count, 0);
    if (total === 0) {
      return [];
    }

    return this.distribution
      .filter((slice) => slice.count > 0)
      .map((slice) => ({
        key: slice.key,
        count: slice.count,
        pct: (slice.count / total) * 100,
        color: SLICE_COLORS[slice.key],
        labelKey: SLICE_LABELS[slice.key],
      }));
  }

  get dominant(): ImpactSegment | null {
    if (this.segments.length === 0) {
      return null;
    }
    return this.segments.reduce((best, segment) => (segment.count > best.count ? segment : best));
  }

  get conicGradient(): string {
    if (this.segments.length === 0) {
      return 'conic-gradient(var(--color-border) 0deg 360deg)';
    }

    let cursor = 0;
    const stops = this.segments.map((segment) => {
      const start = cursor;
      cursor += segment.pct;
      return `${segment.color} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  formatPct(pct: number): string {
    return `${Math.round(pct)}%`;
  }
}
