import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const VIEW_W = 140;
const VIEW_H = 40;
const PAD = 4;
const MIN_POINTS = 2;

/** One plotted observation, pre-labelled by the parent (which owns locale + formatting). */
export interface MacroSparkPoint {
  value: number;
  valueLabel: string;
  dateLabel: string;
}

interface PlottedPoint {
  x: number;
  y: number;
  point: MacroSparkPoint;
}

/**
 * Interactive macro sparkline (issue #58): renders a real series (oldest → newest) as an
 * SVG polyline and, on hover, snaps a marker + tooltip to the nearest observation showing
 * its value and date. Presentational only — no data fetching. Distinct from the trend-only
 * `MacroMiniSparklineComponent` it replaces, which drew a hardcoded up/flat/down shape.
 */
@Component({
  selector: 'app-macro-sparkline',
  standalone: true,
  templateUrl: './macro-sparkline.component.html',
  styleUrl: './macro-sparkline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MacroSparklineComponent {
  readonly points = input<MacroSparkPoint[]>([]);
  /** Direction tint: `true` = up/green, `false` = down/red, `null` = neutral. */
  readonly positive = input<boolean | null>(null);

  protected readonly viewBox = `0 0 ${VIEW_W} ${VIEW_H}`;
  protected readonly hoverIndex = signal<number | null>(null);

  protected readonly tone = computed<'up' | 'down' | 'flat'>(() => {
    const positive = this.positive();
    if (positive === null) {
      return 'flat';
    }
    return positive ? 'up' : 'down';
  });

  protected readonly plotted = computed<PlottedPoint[]>(() => {
    const points = this.points().filter((point) => Number.isFinite(point.value));
    if (points.length < MIN_POINTS) {
      return [];
    }
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, Math.abs(max) * 0.002, 1e-6);
    const spanX = VIEW_W - PAD * 2;
    const spanY = VIEW_H - PAD * 2;
    return points.map((point, index) => ({
      x: PAD + (index / (points.length - 1)) * spanX,
      y: PAD + spanY - ((point.value - min) / range) * spanY,
      point,
    }));
  });

  protected readonly path = computed<string | null>(() => {
    const plotted = this.plotted();
    if (plotted.length < MIN_POINTS) {
      return null;
    }
    return plotted
      .map(
        (entry, index) => `${index === 0 ? 'M' : 'L'} ${entry.x.toFixed(1)} ${entry.y.toFixed(1)}`,
      )
      .join(' ');
  });

  protected readonly active = computed<PlottedPoint | null>(() => {
    const index = this.hoverIndex();
    const plotted = this.plotted();
    if (index === null || index < 0 || index >= plotted.length) {
      return null;
    }
    return plotted[index];
  });

  /** Snap the tooltip to the observation nearest the pointer's x position. */
  protected onMove(event: PointerEvent, host: HTMLElement): void {
    const plotted = this.plotted();
    if (plotted.length === 0) {
      return;
    }
    const rect = host.getBoundingClientRect();
    const ratio = rect.width > 0 ? (event.clientX - rect.left) / rect.width : 0;
    const index = Math.round(ratio * (plotted.length - 1));
    this.hoverIndex.set(Math.min(Math.max(index, 0), plotted.length - 1));
  }

  protected clearHover(): void {
    this.hoverIndex.set(null);
  }
}
