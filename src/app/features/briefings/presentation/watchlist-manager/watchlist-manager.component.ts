import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core';
import { ButtonComponent, PriceDeltaChipComponent, formatPrice } from '../../../../shared';
import { BriefingPanelStore } from '../../application';

@Component({
  selector: 'app-watchlist-manager',
  standalone: true,
  imports: [FormsModule, ButtonComponent, PriceDeltaChipComponent],
  templateUrl: './watchlist-manager.component.html',
  styleUrl: './watchlist-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistManagerComponent {
  readonly store = inject(BriefingPanelStore);
  readonly i18n = inject(TranslationService);

  readonly newWatchlistName = signal('');
  readonly newSymbol = signal('');

  /** Exposes the shared price formatter to the template for the live preview. */
  readonly formatPrice = formatPrice;

  onCreateWatchlist(): void {
    void this.store.createWatchlist(this.newWatchlistName()).then(() => {
      this.newWatchlistName.set('');
    });
  }

  onSymbolChange(value: string): void {
    this.newSymbol.set(value);
    this.store.clearAddSymbolError();
  }

  onAddSymbol(): void {
    const before = this.newSymbol();
    void this.store.addWatchlistItem(before).then(() => {
      // Only clear the input on a successful add (no validation error left behind).
      if (!this.store.addSymbolError()) {
        this.newSymbol.set('');
      }
    });
  }

  onDeleteWatchlist(): void {
    const id = this.store.selectedWatchlistId();
    if (id) {
      void this.store.deleteWatchlist(id);
    }
  }

  onRemoveItem(itemId: string): void {
    void this.store.removeWatchlistItem(itemId);
  }

  /**
   * Moves the watchlist at `index` one slot up (`-1`) or down (`+1`) and
   * persists the new order (issue #66). No `@angular/cdk` in the dependency
   * tree, so reordering uses explicit up/down controls rather than drag-drop.
   */
  onMoveWatchlist(index: number, direction: -1 | 1): void {
    const lists = this.store.watchlists();
    const target = index + direction;
    if (target < 0 || target >= lists.length) {
      return;
    }
    const orderedIds = lists.map((watchlist) => watchlist.id);
    [orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]];
    void this.store.reorderWatchlists(orderedIds);
  }
}
