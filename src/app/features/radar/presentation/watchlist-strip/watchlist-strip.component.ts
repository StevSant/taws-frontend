import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core';
import { WatchlistSummary } from '../../application/watchlist-summary.model';
import { WatchlistSummaryCardComponent } from '../watchlist-summary-card/watchlist-summary-card.component';

/** Above this many lists the strip surfaces a "Ver todas" entry into the `/watchlists` overview. */
const VIEW_ALL_THRESHOLD = 4;

/**
 * "Mis listas" — the radar's at-a-glance row of watchlist cards. Each card's body opens that list's
 * detail (`/watchlists/:id`); that navigation is the only interaction.
 *
 * Creating, renaming and adding symbols stay on `/watchlists`, which the "Gestionar" / "Nueva lista"
 * links point at; a "Ver todas" overflow link appears once the strip holds many lists.
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

  /** Overflow affordance: too many lists to scan comfortably in the strip → point at the overview. */
  readonly showViewAll = computed(() => this.summaries().length > VIEW_ALL_THRESHOLD);

  constructor(readonly i18n: TranslationService) {}
}
