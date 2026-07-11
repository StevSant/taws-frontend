import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core';
import { ButtonComponent } from '../../../../shared';
import { BriefingPanelStore } from '../../application';

@Component({
  selector: 'app-watchlist-manager',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  templateUrl: './watchlist-manager.component.html',
  styleUrl: './watchlist-manager.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistManagerComponent {
  readonly store = inject(BriefingPanelStore);
  readonly i18n = inject(TranslationService);

  readonly newWatchlistName = signal('');
  readonly newSymbol = signal('');

  onCreateWatchlist(): void {
    void this.store.createWatchlist(this.newWatchlistName()).then(() => {
      this.newWatchlistName.set('');
    });
  }

  onAddSymbol(): void {
    void this.store.addWatchlistItem(this.newSymbol()).then(() => {
      this.newSymbol.set('');
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
}
