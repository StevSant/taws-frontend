import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import {
  InstrumentTickerBadgeComponent,
  PriceDeltaChipComponent,
  formatPrice,
} from '../../../../shared';
import { CompositionInstrumentsStore, computeTopMovers } from '../../application';
import { AssetClass, EnrichedInstrument } from '../../domain';
import { MarketsSparklineComponent } from '../markets-sparkline/markets-sparkline.component';

/** One rendered movers column — the ranked rows plus its up/down tint + heading. */
interface MoversColumn {
  key: 'gainers' | 'losers';
  titleKey: TranslationKey;
  tone: 'up' | 'down';
  rows: EnrichedInstrument[];
}

/**
 * "Top movers" for the radar (issue: radar restructure). Two compact columns — biggest gainers /
 * biggest losers — read from the enriched-instruments data already loaded by
 * `CompositionInstrumentsStore` (no new request). "Todos" shows the market-wide highlights;
 * selecting an asset-class chip re-ranks that class's own instruments (`computeTopMovers`). Each
 * row deep-links to the asset detail. Degrades to an empty state when the enriched page is
 * unavailable rather than fabricating rows.
 */
@Component({
  selector: 'app-radar-top-movers',
  standalone: true,
  imports: [
    RouterLink,
    InstrumentTickerBadgeComponent,
    PriceDeltaChipComponent,
    MarketsSparklineComponent,
  ],
  templateUrl: './radar-top-movers.component.html',
  styleUrl: './radar-top-movers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarTopMoversComponent implements OnInit {
  /** Active asset-class chip; `null` = "Todos" (market-wide). */
  readonly selectedClass = input<AssetClass | null>(null);

  private readonly instruments = inject(CompositionInstrumentsStore);
  readonly i18n = inject(TranslationService);

  readonly isLoading = this.instruments.isLoading;

  private readonly movers = computed(() => {
    const assetClass = this.selectedClass();
    const classInstruments =
      assetClass === null ? null : (this.instruments.forClass(assetClass)?.instruments ?? []);
    return computeTopMovers(this.instruments.highlights(), classInstruments);
  });

  readonly columns = computed<MoversColumn[]>(() => [
    { key: 'gainers', titleKey: 'radar.movers.gainers', tone: 'up', rows: this.movers().gainers },
    { key: 'losers', titleKey: 'radar.movers.losers', tone: 'down', rows: this.movers().losers },
  ]);

  /** Anything to show at all — drives the loading vs empty vs columns split in the template. */
  readonly hasMovers = computed(
    () => this.movers().gainers.length > 0 || this.movers().losers.length > 0,
  );

  ngOnInit(): void {
    void this.instruments.load();
  }

  price(instrument: EnrichedInstrument): string {
    return formatPrice(instrument.lastPrice);
  }

  direction(instrument: EnrichedInstrument): boolean | null {
    if (instrument.priceDeltaPct === null) {
      return null;
    }
    return instrument.priceDeltaPct >= 0;
  }
}
