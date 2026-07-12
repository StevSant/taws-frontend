import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { AssetClass } from '../../domain';
import { MarketComposition, MarketCompositionEntry } from '../../application/compute-market-composition';
import { MarketScoreLabel } from '../../application/compute-market-score';
import { ASSET_CLASS_LABEL_KEYS } from '../asset-class-label-keys';

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
}

/**
 * Global overview rendered as a contribution-per-class breakdown (issue #41):
 * a stacked bar sized by each class's share of the universe and colored by that
 * class's own market-score sentiment, plus a per-class row list. This replaces
 * the misleading flat blended score at the global level. Clicking a class asks
 * the page to scope the dashboard to it.
 */
@Component({
  selector: 'app-radar-composition-overview',
  standalone: true,
  templateUrl: './radar-composition-overview.component.html',
  styleUrl: './radar-composition-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarCompositionOverviewComponent {
  @Input({ required: true }) composition!: MarketComposition;

  @Output() selectClass = new EventEmitter<AssetClass>();

  constructor(readonly i18n: TranslationService) {}

  get rows(): CompositionRow[] {
    return this.composition.entries.map((entry) => ({
      ...entry,
      labelKey: ASSET_CLASS_LABEL_KEYS[entry.assetClass],
      scoreColor: SCORE_COLORS[entry.marketScore.label],
      scoreLabelKey: SCORE_LABEL_KEYS[entry.marketScore.label],
    }));
  }

  formatPct(pct: number): string {
    return `${Math.round(pct)}%`;
  }

  select(assetClass: AssetClass): void {
    this.selectClass.emit(assetClass);
  }
}
