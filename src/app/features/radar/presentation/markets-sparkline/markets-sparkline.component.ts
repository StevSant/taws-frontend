import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const VIEW_W = 120;
const VIEW_H = 32;
const PAD = 3;

/**
 * Tiny data-driven price sparkline for a markets-explorer row. Renders an SVG
 * polyline straight from the enriched row's `sparkline` closes (oldest → newest);
 * colour follows the row's direction (up = positive, down = negative). Presentational
 * only — no data fetching. Distinct from `MacroMiniSparklineComponent` (trend-only).
 */
@Component({
  selector: 'app-markets-sparkline',
  standalone: true,
  templateUrl: './markets-sparkline.component.html',
  styleUrl: './markets-sparkline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketsSparklineComponent {
  readonly points = input<number[]>([]);
  /** Direction tint: `true` = positive/green, `false` = negative/red, `null` = neutral. */
  readonly positive = input<boolean | null>(null);

  protected readonly viewBox = `0 0 ${VIEW_W} ${VIEW_H}`;

  protected readonly path = computed(() => {
    const values = this.points().filter((value) => Number.isFinite(value));
    if (values.length < 2) {
      return null;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, Math.abs(max) * 0.002, 1e-6);
    const spanX = VIEW_W - PAD * 2;
    const spanY = VIEW_H - PAD * 2;
    return values
      .map((value, index) => {
        const x = PAD + (index / (values.length - 1)) * spanX;
        const y = PAD + spanY - ((value - min) / range) * spanY;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  });

  protected readonly tone = computed<'up' | 'down' | 'flat'>(() => {
    const positive = this.positive();
    if (positive === null) {
      return 'flat';
    }
    return positive ? 'up' : 'down';
  });
}
