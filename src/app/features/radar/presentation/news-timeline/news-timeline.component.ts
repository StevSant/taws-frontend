import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, inject, signal } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { InstrumentTickerBadgeComponent } from '../../../../shared';
import { RadarStore, NewsTimelineEntry } from '../../application/radar-store';
import { ImpactClass } from '../../domain';

const IMPACT_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

@Component({
  selector: 'app-news-timeline',
  standalone: true,
  imports: [DatePipe, InstrumentTickerBadgeComponent],
  templateUrl: './news-timeline.component.html',
  styleUrl: './news-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsTimelineComponent {
  @Input({ required: true }) entries: NewsTimelineEntry[] = [];

  readonly store = inject(RadarStore);
  readonly i18n = inject(TranslationService);
  readonly visibleCount = signal(8);

  impactLabel(impact?: ImpactClass): string {
    if (!impact) {
      return this.i18n.t('radar.landscape.unclassified');
    }
    return this.i18n.t(IMPACT_LABELS[impact]);
  }

  confidenceLabel(confidence?: number): string | null {
    if (confidence === undefined) {
      return null;
    }
    return `${Math.round(confidence * 100)}%`;
  }

  relativeTime(iso: string): string {
    const diffMs = Date.now() - Date.parse(iso);
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) {
      return `${this.i18n.t('radar.timeline.ago')} ${Math.max(1, minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${this.i18n.t('radar.timeline.ago')} ${hours} h`;
    }
    return `${this.i18n.t('radar.timeline.ago')} ${Math.floor(hours / 24)} d`;
  }

  visibleEntries(): NewsTimelineEntry[] {
    return this.entries.slice(0, this.visibleCount());
  }

  showMore(): void {
    this.visibleCount.update((count) => count + 8);
  }

  onAnalyze(symbol: string): void {
    void this.store.generateSignal(symbol);
  }
}
