import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OhlcBar } from '../charts';
import { UnusualMove } from '../../features/radar/domain';

const VIEW_W = 220;
const VIEW_H = 56;
const PAD_X = 8;
const PAD_Y = 8;
const MAX_POINTS = 28;

@Component({
  selector: 'app-return-sparkline',
  standalone: true,
  templateUrl: './return-sparkline.component.html',
  styleUrl: './return-sparkline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnSparklineComponent {
  /** Preferred source for a real price line (OHLC closes). */
  readonly candles = input<OhlcBar[]>([]);
  /** Sparse unusual-move days — used for `bars` variant, or as weak line fallback. */
  readonly moves = input<UnusualMove[]>([]);
  readonly width = input(220);
  readonly height = input(56);
  readonly variant = input<'line' | 'bars'>('line');

  protected readonly priceSeries = computed(() => {
    const closes = this.candles()
      .map((bar) => bar.c)
      .filter((value) => Number.isFinite(value));
    if (closes.length >= 2) {
      return downsample(closes, MAX_POINTS);
    }
    return [];
  });

  protected readonly lineGeometry = computed(() => {
    const values = this.priceSeries();
    if (values.length < 2) {
      return null;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, Math.abs(max) * 0.002, 0.01);
    const spanX = VIEW_W - PAD_X * 2;
    const spanY = VIEW_H - PAD_Y * 2;

    const points = values.map((value, index) => {
      const x = PAD_X + (index / (values.length - 1)) * spanX;
      const y = PAD_Y + spanY - ((value - min) / range) * spanY;
      return { x, y, value };
    });

    const line = `M ${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`;
    const last = points[points.length - 1];
    const area = `${line} L ${last.x.toFixed(1)} ${(VIEW_H - 2).toFixed(1)} L ${points[0].x.toFixed(1)} ${(VIEW_H - 2).toFixed(1)} Z`;

    return {
      line,
      area,
      end: last,
      up: values[values.length - 1] >= values[0],
    };
  });

  protected readonly bars = computed(() => {
    const values = this.moves().map((move) => move.returnPct);
    if (values.length === 0) {
      return [];
    }

    const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 0.5);
    const slotWidth = 200 / values.length;
    const barWidth = Math.max(slotWidth - 3, 3);
    return values.map((value, index) => ({
      index,
      value,
      move: this.moves()[index],
      x: 10 + index * slotWidth,
      barWidth,
      barHeight: (Math.abs(value) / maxAbs) * 18,
      positive: value >= 0,
    }));
  });

  protected readonly trendUp = computed(() => {
    const geo = this.lineGeometry();
    if (geo) {
      return geo.up;
    }
    const values = this.moves().map((move) => move.returnPct);
    if (values.length === 0) {
      return true;
    }
    if (values.length < 2) {
      return values[0] >= 0;
    }
    return values[values.length - 1] >= values[0];
  });

  formatTooltip(move: UnusualMove): string {
    const sign = move.returnPct > 0 ? '+' : '';
    const date = move.date ? new Date(move.date).toLocaleDateString() : '';
    const z =
      move.zScore !== undefined && move.zScore !== null ? ` · z=${move.zScore.toFixed(1)}` : '';
    return `${date}: ${sign}${move.returnPct.toFixed(2)}%${z}`;
  }
}

function downsample(values: number[], maxPoints: number): number[] {
  if (values.length <= maxPoints) {
    return values;
  }
  const result: number[] = [];
  const last = values.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    const index = Math.round((i / (maxPoints - 1)) * last);
    result.push(values[index]);
  }
  return result;
}
