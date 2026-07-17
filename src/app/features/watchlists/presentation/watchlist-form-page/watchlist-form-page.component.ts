import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslationService } from '../../../../core';
import { ButtonComponent } from '../../../../shared';
import { WatchlistStore } from '../../../briefings/application';
import { WatchlistItem } from '../../../briefings/domain';
import { AddInstrumentStore } from '../../../radar/application';
import { Instrument } from '../../../radar/domain';

/** A chip shown in the picker: a symbol, plus the item id when it's a persisted (edit-mode) item. */
interface FormChip {
  symbol: string;
  itemId?: string;
}

/**
 * Create/edit form for a single watchlist (`/watchlists/new` and `/watchlists/:id/edit`). Scoped to
 * exactly one list — no list switcher. Create mode collects picked symbols locally and only writes
 * on "Crear lista" (create list, then add each item sequentially via the per-item endpoint, then
 * route to the new list's detail). Edit mode pre-fills from the resolved list and persists every
 * add/remove/rename immediately, returning to the detail page on "Listo". Reuses the radar
 * `AddInstrumentStore` for the instrument search over the curated universe. Auth-gated via the route.
 */
@Component({
  selector: 'app-watchlist-form-page',
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonComponent],
  providers: [AddInstrumentStore],
  templateUrl: './watchlist-form-page.component.html',
  styleUrl: './watchlist-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistFormPageComponent implements OnInit {
  readonly store = inject(WatchlistStore);
  readonly picker = inject(AddInstrumentStore);
  readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** The list id in edit mode; `null` in create mode. */
  readonly editId = signal<string | null>(null);
  readonly name = signal('');
  readonly submitting = signal(false);
  /** Create-mode local selection (uppercase symbols); unused in edit mode. */
  private readonly pickedSymbols = signal<string[]>([]);

  readonly isEdit = computed(() => this.editId() !== null);

  readonly titleKey = computed(() =>
    this.isEdit() ? 'watchlists.form.editTitle' : 'watchlists.form.createTitle',
  );

  /** Chips: create → local picks; edit → the active list's persisted items. */
  readonly chips = computed<FormChip[]>(() => {
    if (this.isEdit()) {
      return this.store.items().map((item) => ({ symbol: item.symbol, itemId: item.id }));
    }
    return this.pickedSymbols().map((symbol) => ({ symbol }));
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = params.get('id');
      this.editId.set(id);
      if (id) {
        void this.enterEditMode(id);
      } else {
        this.name.set('');
        this.pickedSymbols.set([]);
      }
    });
  }

  ngOnInit(): void {
    void this.picker.init();
  }

  private async enterEditMode(id: string): Promise<void> {
    await this.store.ensureLoaded();
    await this.store.selectWatchlist(id);
    this.name.set(this.store.activeWatchlist()?.name ?? '');
  }

  isPicked(symbol: string): boolean {
    const needle = symbol.toUpperCase();
    return this.isEdit()
      ? this.store.isFollowed(needle)
      : this.pickedSymbols().some((picked) => picked === needle);
  }

  onSearch(value: string): void {
    this.picker.setQuery(value);
  }

  /** Result click: edit → persist add; create → toggle the local pick. */
  onToggle(instrument: Instrument): void {
    const symbol = instrument.symbol.toUpperCase();
    if (this.isEdit()) {
      if (!this.isPicked(symbol)) {
        void this.picker.add(symbol);
      }
      return;
    }
    if (this.isPicked(symbol)) {
      this.pickedSymbols.update((picks) => picks.filter((picked) => picked !== symbol));
    } else {
      this.pickedSymbols.update((picks) => [...picks, symbol]);
    }
  }

  /** Chip remove: edit → persist removal by item id; create → drop the local pick. */
  onRemoveChip(chip: FormChip): void {
    if (this.isEdit()) {
      const item = this.store.items().find((candidate) => candidate.id === chip.itemId);
      if (item) {
        void this.removeItem(item);
      }
      return;
    }
    this.pickedSymbols.update((picks) => picks.filter((picked) => picked !== chip.symbol));
  }

  private async removeItem(item: WatchlistItem): Promise<void> {
    await this.picker.remove(item);
  }

  /** Edit mode: persist the rename (on blur / done). No-op in create mode. */
  onNameCommit(): void {
    const id = this.editId();
    const trimmed = this.name().trim();
    if (id && trimmed && trimmed !== this.store.activeWatchlist()?.name) {
      void this.store.renameWatchlist(id, trimmed);
    }
  }

  /** Primary action: create → build the list; edit → return to detail. */
  async onSubmit(): Promise<void> {
    if (this.isEdit()) {
      this.onNameCommit();
      await this.router.navigate(['/watchlists', this.editId()]);
      return;
    }
    const trimmed = this.name().trim();
    if (!trimmed || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    try {
      const created = await this.store.createWatchlist(trimmed);
      if (!created) {
        return; // creation failed — the store surfaced the error on `store.error()`.
      }
      // `createWatchlist` sets the new list active, so `addSymbol` targets it. Sequential per the
      // spec (no bulk endpoint); each is a `POST /api/v1/watchlists/{id}/items`.
      for (const symbol of this.pickedSymbols()) {
        await this.store.addSymbol(symbol);
      }
      await this.router.navigate(['/watchlists', created.id]);
    } finally {
      this.submitting.set(false);
    }
  }
}
