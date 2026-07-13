import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { TranslationService } from '../../../../core';
import { ButtonComponent } from '../../../../shared';

/**
 * Reusable read-only view of a signal's AI analysis (issue #40): thesis, key
 * drivers, and risk factors — or an explicit "análisis no disponible" state
 * when the classification fell back to an uncertain/zero-confidence call
 * (`analysisAvailable === false`). Never renders an empty thesis as if it were
 * a real judgment.
 *
 * The unavailable state can offer a way out (issue #21). A signal is routinely
 * *classified* (e.g. positive @ 80% confidence) yet carries no thesis/drivers/risks,
 * and the user was left staring at "Análisis no disponible" with no action — a dead
 * end. Hosts that can re-run the Analyst pipeline opt in with `canRegenerate` and
 * handle `regenerate`; hosts that can't (the news detail page) leave it off and see
 * the state exactly as before.
 *
 * Pure presentation: it receives the already-mapped analysis fields as inputs
 * and holds no state, so it can be mounted both inside the compact radar card
 * (expandable) and on the per-news detail page (issue #38).
 */
@Component({
  selector: 'app-signal-analysis',
  standalone: true,
  imports: [ButtonComponent],
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
  /** Opt in to the "Regenerar análisis" action in the unavailable state (issue #21). */
  @Input() canRegenerate = false;
  /** Drives the action's disabled state + in-progress label while the pipeline runs. */
  @Input() isRegenerating = false;
  /** Message from a failed regenerate attempt, shown next to the action that caused it. */
  @Input() regenerateError: string | null = null;

  @Output() readonly regenerate = new EventEmitter<void>();

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

  onRegenerate(): void {
    this.regenerate.emit();
  }
}
