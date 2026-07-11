import { Component, Input } from '@angular/core';

/**
 * Minimal placeholder for feature pages that don't have real content yet
 * (radar/scenarios/briefings during T0). Presentation-only — callers pass
 * already-translated strings, this component owns no i18n/business logic.
 */
@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  templateUrl: './placeholder-page.component.html',
  styleUrl: './placeholder-page.component.scss',
})
export class PlaceholderPageComponent {
  @Input() title = '';
  @Input() description = '';
  @Input() badge = '';
}
