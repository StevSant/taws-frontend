import { Component } from '@angular/core';
import { TranslationService } from '../../../../core';
import { PlaceholderPageComponent } from '../../../../shared';

/**
 * Scenario Lab page (T0 placeholder): "what if X happens" market simulation
 * — presets + free-form intake, causal-chain visualization, per-asset-class
 * impact map, and evidence panel land here in T1.
 */
@Component({
  selector: 'app-scenarios-page',
  standalone: true,
  imports: [PlaceholderPageComponent],
  templateUrl: './scenarios-page.component.html',
  styleUrl: './scenarios-page.component.scss',
})
export class ScenariosPageComponent {
  constructor(readonly i18n: TranslationService) {}
}
