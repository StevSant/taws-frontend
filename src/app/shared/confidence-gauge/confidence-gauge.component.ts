import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

let nextUid = 0;

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MIN_VALUE = 0;
const MAX_VALUE = 100;

/**
 * Hand-rolled SVG arc gauge (0-100%) with a gold gradient stroke and glow
 * filter. Purely visual — the caller passes the number, no copy is owned
 * by this component so it needs no i18n keys of its own.
 */
@Component({
  selector: 'app-confidence-gauge',
  standalone: true,
  templateUrl: './confidence-gauge.component.html',
  styleUrl: './confidence-gauge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfidenceGaugeComponent {
  /** Confidence percentage, clamped to [0, 100]. */
  readonly value = input(50);

  /** Rendered width/height in px. */
  readonly size = input(72);

  protected readonly uid = `confidence-gauge-${nextUid++}`;
  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;

  protected readonly clampedValue = computed(() =>
    Math.min(MAX_VALUE, Math.max(MIN_VALUE, this.value())),
  );

  protected readonly dashOffset = computed(
    () => CIRCUMFERENCE - (this.clampedValue() / MAX_VALUE) * CIRCUMFERENCE,
  );

  protected readonly roundedValue = computed(() => Math.round(this.clampedValue()));
}
