import { Component } from '@angular/core';
import { TranslationService } from '../../../../core';
import { PlaceholderPageComponent } from '../../../../shared';

/**
 * Radar page (T0 placeholder): news & signals radar — instrument-linked
 * news feed with impact classification, confidence, and price-movement
 * evidence. Filters by instrument type/asset/recency land here next.
 */
@Component({
  selector: 'app-radar-page',
  standalone: true,
  imports: [PlaceholderPageComponent],
  templateUrl: './radar-page.component.html',
  styleUrl: './radar-page.component.scss',
})
export class RadarPageComponent {
  constructor(readonly i18n: TranslationService) {}
}
