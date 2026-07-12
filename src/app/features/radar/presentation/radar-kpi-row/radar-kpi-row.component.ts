import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslationService } from '../../../../core';
import { RadarKpiSummary } from '../../application/radar-store';

@Component({
  selector: 'app-radar-kpi-row',
  standalone: true,
  templateUrl: './radar-kpi-row.component.html',
  styleUrl: './radar-kpi-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarKpiRowComponent {
  @Input({ required: true }) kpis!: RadarKpiSummary;
  @Input() sinceHours = 48;

  constructor(readonly i18n: TranslationService) {}

  pendingPct(): string {
    if (this.kpis.newsDetected === 0) {
      return '0%';
    }
    const pct = Math.round((this.kpis.pendingReview / this.kpis.newsDetected) * 100);
    return `${pct}%`;
  }

  trendLabel(): string {
    const sign = this.kpis.newsTrend > 0 ? '+' : '';
    const halfWindow = Math.max(1, Math.round(this.sinceHours / 2));
    return `${sign}${this.kpis.newsTrend} ${this.i18n.t('radar.kpi.newsTrendSuffix')} ${halfWindow}h`;
  }
}
