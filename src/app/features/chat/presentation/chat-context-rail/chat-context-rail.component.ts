import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import {
  InstrumentTickerBadgeComponent,
  PriceDeltaChipComponent,
  formatPrice,
} from '../../../../shared';
import { RadarStore } from '../../../radar/application';
import { ImpactClass, NewsItem } from '../../../radar/domain';
import { ChatNewsQuestion } from '../../domain';

const IMPACT_LABELS: Record<ImpactClass, TranslationKey> = {
  positive: 'radar.card.impact.positive',
  negative: 'radar.card.impact.negative',
  neutral: 'radar.card.impact.neutral',
  uncertain: 'radar.card.impact.uncertain',
};

@Component({
  selector: 'app-chat-context-rail',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    InstrumentTickerBadgeComponent,
    PriceDeltaChipComponent,
  ],
  templateUrl: './chat-context-rail.component.html',
  styleUrl: './chat-context-rail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatContextRailComponent implements OnInit {
  readonly radar = inject(RadarStore);
  readonly i18n = inject(TranslationService);
  readonly askNews = output<ChatNewsQuestion>();
  readonly closePanel = output<void>();

  ngOnInit(): void {
    void this.radar.init();
  }

  onClose(): void {
    this.closePanel.emit();
  }

  topNews() {
    return this.radar.newsTimeline().slice(0, 4);
  }

  trackedSignals() {
    return this.radar.signals().slice(0, 4);
  }

  impactLabel(impact?: ImpactClass): string {
    if (!impact) {
      return this.i18n.t('radar.landscape.neutral');
    }
    return this.i18n.t(IMPACT_LABELS[impact]);
  }

  askAboutNews(news: NewsItem, symbol: string): void {
    const prompt = this.i18n
      .t('chat.rail.news.askPrompt')
      .replace('{symbol}', symbol)
      .replace('{title}', news.title);
    this.askNews.emit({
      prompt,
      reference: { kind: 'news', newsId: news.id, title: news.title, source: news.source },
    });
  }

  formatPrice(value?: number | null): string {
    return formatPrice(value);
  }
}
