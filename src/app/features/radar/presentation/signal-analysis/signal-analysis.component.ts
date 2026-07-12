import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { TranslationService } from '../../../../core';

/**
 * Reusable read-only view of a signal's AI analysis (issue #40): thesis, key
 * drivers, and risk factors — or an explicit "análisis no disponible" state
 * when the classification fell back to an uncertain/zero-confidence call
 * (`analysisAvailable === false`). Never renders an empty thesis as if it were
 * a real judgment.
 *
 * Pure presentation: it receives the already-mapped analysis fields as inputs
 * and holds no state, so it can be mounted both inside the compact radar card
 * (expandable) and on the per-news detail page (issue #38).
 */
@Component({
  selector: 'app-signal-analysis',
  standalone: true,
  imports: [],
  templateUrl: './signal-analysis.component.html',
  styleUrl: './signal-analysis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalAnalysisComponent {
  @Input() thesis?: string;
  @Input() keyDrivers: string[] = [];
  @Input() riskFactors: string[] = [];
  /** `false` ⇒ classification fell back to uncertain/zero-confidence. */
  @Input() analysisAvailable = false;

  readonly i18n = inject(TranslationService);

  hasThesis(): boolean {
    return !!this.thesis?.trim();
  }

  /** True when there is genuine analysis to show (real classification + some content). */
  hasContent(): boolean {
    return (
      this.analysisAvailable &&
      (this.hasThesis() || this.keyDrivers.length > 0 || this.riskFactors.length > 0)
    );
  }
}
