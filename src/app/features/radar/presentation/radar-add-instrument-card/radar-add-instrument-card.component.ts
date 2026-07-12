import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core';
import { AddInstrumentStore } from '../../application';
import { WatchlistItem } from '../../../briefings/domain';
import { Instrument } from '../../domain';

/**
 * "Agregar instrumento" picker (issue #60). Replaces the old dead-end link to /briefings:
 * a button opens an inline search/autocomplete over the instrument universe; selecting an
 * instrument adds it to the tracked watchlist (optimistic + persisted) and it shows up as a
 * chip immediately, surviving a refresh. Duplicates are handled gracefully. "Ver todas"
 * navigates to the markets explorer page.
 */
@Component({
  selector: 'app-radar-add-instrument-card',
  standalone: true,
  imports: [RouterLink],
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
    void this.store.add(instrument.symbol, instrument.name);
  }

  onRemove(item: WatchlistItem): void {
    void this.store.remove(item);
  }
}
