import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatPriceDelta } from './format-price-delta';
import { PriceDirection } from './price-direction.model';
import { resolvePriceDirection } from './resolve-price-direction';

/**
 * Reusable, project-wide chip for a percentage change: green when up, red when
 * down, neutral gray when flat/missing. The single source of truth for
 * direction coloring + percent formatting — surfaces bind a numeric delta and
 * never hand-roll their own sign/color logic.
 */
@Component({
  selector: 'app-price-delta-chip',
  standalone: true,
  template: `<span class="price-delta-chip" [class]="'price-delta-chip--' + direction()">{{
    label()
  }}</span>`,
  styleUrl: './price-delta-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceDeltaChipComponent {
  /** Percentage change; `null`/`undefined` renders as a neutral em dash. */
  readonly value = input<number | null | undefined>(undefined);

  readonly direction = computed<PriceDirection>(() => resolvePriceDirection(this.value()));
  readonly label = computed(() => formatPriceDelta(this.value()));
}
