import { Component } from '@angular/core';
import { TranslationService } from '../../../../core';
import { PlaceholderPageComponent } from '../../../../shared';

/**
 * Briefings page (T0 placeholder): per-watchlist briefings with a review
 * workflow (reviewed/escalated/discarded + justification). On-demand and
 * scheduled generation land here in T1 — never trade execution.
 */
@Component({
  selector: 'app-briefings-page',
  standalone: true,
  imports: [PlaceholderPageComponent],
  templateUrl: './briefings-page.component.html',
  styleUrl: './briefings-page.component.scss',
})
export class BriefingsPageComponent {
  constructor(readonly i18n: TranslationService) {}
}
