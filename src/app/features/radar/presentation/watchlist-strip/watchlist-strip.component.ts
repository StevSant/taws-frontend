import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core';
import { WatchlistSummary } from '../../application/watchlist-summary.model';
import { WatchlistSummaryCardComponent } from '../watchlist-summary-card/watchlist-summary-card.component';

/**
 * "Mis listas" — the radar's at-a-glance row of watchlist cards, and the only place outside
 * `/watchlists` where the user can see they have more than one list or switch between them.
 *
 * Read-and-switch only: creating, renaming and adding symbols stay on `/watchlists`, which the
 * "Gestionar" / "Nueva lista" links point at.
 */
@Component({
  selector: 'app-watchlist-strip',
  standalone: true,
  imports: [RouterLink, WatchlistSummaryCardComponent],
  templateUrl: './watchlist-strip.component.html',
  styleUrl: './watchlist-strip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistStripComponent {
  readonly summaries = input.required<WatchlistSummary[]>();
  readonly activeId = input<string | null>(null);
  readonly select = output<string>();

  constructor(readonly i18n: TranslationService) {}
}
