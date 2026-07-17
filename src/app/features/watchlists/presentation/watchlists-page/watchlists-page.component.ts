import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core';
import {
  ButtonComponent,
  EmptyStateComponent,
  FeaturePageHeaderComponent,
} from '../../../../shared';
import { WatchlistStore } from '../../../briefings/application';
import { Watchlist, WatchlistItem } from '../../../briefings/domain';
import { AddInstrumentStore } from '../../../radar/application';
import { Instrument } from '../../../radar/domain';

/**
 * Dedicated watchlist management page (`/watchlists`, issue #17). Full CRUD over the user's
 * watchlists: list / create / rename / delete, plus add/remove instruments searched over the same
 * universe the radar widget uses.
 *
 * Backed by the root-provided `WatchlistStore` (multi-list state + create/rename/delete) and a
 * component-scoped `AddInstrumentStore` (instrument search + add/remove of the active list's
 * items) — the same engine as the radar widget. Both read/write the shared store, so every change
 * here shows up on the radar home section without a reload (issue #16). Auth-guarded via the route.
 */
@Component({
  selector: 'app-watchlists-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonComponent,
    EmptyStateComponent,
    FeaturePageHeaderComponent,
  ],
  providers: [AddInstrumentStore],
  templateUrl: './watchlists-page.component.html',
  styleUrl: './watchlists-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistsPageComponent implements OnInit {
  readonly store = inject(WatchlistStore);
  readonly picker = inject(AddInstrumentStore);
  readonly i18n = inject(TranslationService);

  readonly newName = signal('');
  readonly renamingId = signal<string | null>(null);
  readonly renameDraft = signal('');

  ngOnInit(): void {
    void this.picker.init();
  }

  onCreate(): void {
    const name = this.newName().trim();
    if (!name) {
      return;
    }
    void this.store.createWatchlist(name).then(() => this.newName.set(''));
  }

  onSelect(watchlistId: string): void {
    void this.store.selectWatchlist(watchlistId);
  }

  startRename(watchlist: Watchlist): void {
    this.renamingId.set(watchlist.id);
    this.renameDraft.set(watchlist.name);
  }

  cancelRename(): void {
    this.renamingId.set(null);
    this.renameDraft.set('');
  }

  saveRename(watchlistId: string): void {
    const name = this.renameDraft().trim();
    if (!name) {
      return;
    }
    void this.store.renameWatchlist(watchlistId, name).then(() => this.cancelRename());
  }

  onDelete(watchlistId: string): void {
    void this.store.deleteWatchlist(watchlistId);
  }

  onSearch(value: string): void {
    this.picker.setQuery(value);
  }

  onAdd(instrument: Instrument): void {
    void this.picker.add(instrument.symbol);
  }

  onRemove(item: WatchlistItem): void {
    void this.picker.remove(item);
  }
}
