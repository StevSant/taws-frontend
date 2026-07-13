import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SignalPrepProgress } from '../../application';

/** Circumference of the SVG progress ring (r = 52). Kept as a constant so the
 * template's `stroke-dasharray`/`stroke-dashoffset` math stays readable. */
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

/**
 * Presentational focal state for on-demand briefing generation (issue: condensed
 * Informes home). Pure/dumb: the page passes the store's `signalPrepProgress()`
 * plus resolved i18n copy; this component owns only the progress-ring geometry
 * and the reduced-motion-safe pulse. It renders full available width within the
 * Informes content flow — it does NOT overlay or block the whole app.
 */
@Component({
  selector: 'app-generation-focus',
  standalone: true,
  templateUrl: './generation-focus.component.html',
  styleUrl: './generation-focus.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerationFocusComponent {
  /** Live pre-briefing pipeline progress, or `null` before per-symbol prep starts. */
  readonly progress = input<SignalPrepProgress | null>(null);
  /** Page-level error surfaced inline in the focal card when generation fails. */
  readonly error = input<string | null>(null);

  readonly heading = input.required<string>();
  readonly subtext = input.required<string>();
  /** Localized "Step" word — rendered as `{stepLabel} {current}/{total}`. */
  readonly stepLabel = input.required<string>();
  /** Copy shown while `progress` is still `null` (prep hasn't emitted a step yet). */
  readonly preparingLabel = input.required<string>();

  readonly circumference = RING_CIRCUMFERENCE;

  /** Fraction 0–1 of prep completed; 0 while indeterminate so the ring reads "starting". */
  readonly fraction = computed<number>(() => {
    const prep = this.progress();
    if (!prep || prep.total <= 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, prep.current / prep.total));
  });

  /** Whole-percent label for the ring center (falls back to prep copy when indeterminate). */
  readonly percentLabel = computed<string | null>(() => {
    if (!this.progress()) {
      return null;
    }
    return `${Math.round(this.fraction() * 100)}%`;
  });

  /** Dash offset that visually fills the ring to `fraction`. */
  readonly dashOffset = computed<number>(() => RING_CIRCUMFERENCE * (1 - this.fraction()));
}
