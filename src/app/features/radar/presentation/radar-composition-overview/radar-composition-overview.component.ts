import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { formatPrice, PriceDeltaChipComponent } from '../../../../shared';
import { AssetClass, EnrichedInstrument } from '../../domain';
import {
  MarketComposition,
  MarketCompositionEntry,
} from '../../application/compute-market-composition';
import { MarketScoreLabel } from '../../application/compute-market-score';
import { CompositionInstrumentsStore } from '../../application';
import { ASSET_CLASS_LABEL_KEYS } from '../asset-class-label-keys';
import { MarketsSparklineComponent } from '../markets-sparkline/markets-sparkline.component';

const SCORE_COLORS: Record<MarketScoreLabel, string> = {
  bullish: 'var(--color-gain)',
  bearish: 'var(--color-loss)',
  neutral: 'var(--color-text-muted)',
};

const SCORE_LABEL_KEYS: Record<MarketScoreLabel, TranslationKey> = {
  bullish: 'radar.score.bullish',
  bearish: 'radar.score.bearish',
  neutral: 'radar.score.neutral',
};

/** A composition row enriched with the presentation bits the template needs. */
export interface CompositionRow extends MarketCompositionEntry {
  labelKey: TranslationKey;
  scoreColor: string;
  scoreLabelKey: TranslationKey;
  /** Aggregate self-normalized mini-trend for the class (0..1); `[]` when history is thin. */
  trend: number[];
  /** Trend slope tint: `true` up, `false` down, `null` flat/unknown. */
  trendPositive: boolean | null;
  instruments: EnrichedInstrument[];
}

/**
 * Global overview rendered as a contribution-per-class breakdown (issues #41, #58): a
 * per-class bar sized by each class's share of the universe and colored by that class's
 * own market-score sentiment, now with a real aggregate mini-trend, tooltips/legend
 * explaining share % + score, and an expandable per-class instrument list (price + %
 * change from `GET /api/v1/instruments/enriched`). A dedicated "open explorer" affordance
 * still deep-links to the markets explorer filtered by the class (`selectClass`).
 */
@Component({
  selector: 'app-radar-composition-overview',
  standalone: true,
  imports: [PriceDeltaChipComponent, MarketsSparklineComponent],
  templateUrl: './radar-composition-overview.component.html',
  styleUrl: './radar-composition-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarCompositionOverviewComponent implements OnInit {
  @Input({ required: true }) composition!: MarketComposition;

  @Output() selectClass = new EventEmitter<AssetClass>();

  readonly instruments = inject(CompositionInstrumentsStore);
  private readonly expanded = signal<ReadonlySet<AssetClass>>(new Set());

  constructor(readonly i18n: TranslationService) {}

  ngOnInit(): void {
    void this.instruments.load();
  }

  get rows(): CompositionRow[] {
    return this.composition.entries.map((entry) => {
      const classInstruments = this.instruments.forClass(entry.assetClass);
      const trend = classInstruments?.trend ?? [];
      return {
        ...entry,
        labelKey: ASSET_CLASS_LABEL_KEYS[entry.assetClass],
        scoreColor: SCORE_COLORS[entry.marketScore.label],
        scoreLabelKey: SCORE_LABEL_KEYS[entry.marketScore.label],
        trend,
        trendPositive: this.trendSlope(trend),
        instruments: classInstruments?.instruments ?? [],
      };
    });
  }

  formatPct(pct: number): string {
    return `${Math.round(pct)}%`;
  }

  price(instrument: EnrichedInstrument): string {
    return formatPrice(instrument.lastPrice);
  }

  isExpanded(assetClass: AssetClass): boolean {
    return this.expanded().has(assetClass);
  }

  toggleExpand(assetClass: AssetClass): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(assetClass)) {
        next.delete(assetClass);
      } else {
        next.add(assetClass);
      }
      return next;
    });
  }

  /** Deep-link to the markets explorer filtered by this class (kept from the shipped behavior). */
  openExplorer(assetClass: AssetClass, event: Event): void {
    event.stopPropagation();
    this.selectClass.emit(assetClass);
  }

  private trendSlope(trend: number[]): boolean | null {
    if (trend.length < 2) {
      return null;
    }
    const delta = trend[trend.length - 1] - trend[0];
    if (delta === 0) {
      return null;
    }
    return delta > 0;
  }
}
