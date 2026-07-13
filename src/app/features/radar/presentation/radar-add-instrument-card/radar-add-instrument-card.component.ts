import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { TranslationService } from '../../../../core';
import { AddInstrumentStore } from '../../application';
import { WatchlistItem } from '../../../briefings/domain';
import { CoinCandidate, Instrument } from '../../domain';

/**
 * "Agregar instrumento" picker (issue #60). Replaces the old dead-end link to /briefings:
 * a button opens an inline search/autocomplete over the instrument universe; selecting an
 * instrument adds it to the tracked watchlist (optimistic + persisted) and it shows up as a
 * chip immediately, surviving a refresh. ("Ver todas" now lives in the instruments
 * section header on the radar page.)
 */
@Component({
  selector: 'app-radar-add-instrument-card',
  standalone: true,
  imports: [],
  providers: [AddInstrumentStore],
  templateUrl: './radar-add-instrument-card.component.html',
  styleUrl: './radar-add-instrument-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarAddInstrumentCardComponent implements OnInit {
  constructor(
    readonly store: AddInstrumentStore,
    readonly i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    void this.store.init();
  }

  onToggle(): void {
    this.store.toggleOpen();
  }

  onSearch(value: string): void {
    this.store.setQuery(value);
  }

  onAdd(instrument: Instrument): void {
    void this.store.add(instrument.symbol);
  }

  /** Search CoinGecko for the current query (explicit trigger — avoids per-keystroke API calls). */
  onSearchCoinGecko(): void {
    void this.store.search(this.store.query());
  }

  /** Register a searched coin into the global catalog and follow it. */
  onRegister(candidate: CoinCandidate): void {
    void this.store.registerAndFollow(candidate);
  }

  onRemove(item: WatchlistItem): void {
    void this.store.remove(item);
  }
}
