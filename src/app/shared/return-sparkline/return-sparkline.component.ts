import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslationService } from '../../core';
import { OhlcBar } from '../charts';
import { UnusualMove } from '../../features/radar/domain';

const VIEW_W = 220;
const VIEW_H = 56;
const PAD_X = 8;
const PAD_Y = 8;
const MAX_POINTS = 28;
const PERCENT_MULTIPLIER = 100;
const LOCALE_TAGS: Record<string, string> = { es: 'es-ES', en: 'en-US' };

/** One line-variant sample: close price plus the metadata surfaced on hover. */
interface SparklinePoint {
  close: number;
  date: string;
  changePct: number | null;
}

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

  private readonly i18n = inject(TranslationService);

  /** Index of the hovered line point, or `null` when the pointer is outside. */
  protected readonly hoverIndex = signal<number | null>(null);

  protected readonly viewWidth = VIEW_W;
  protected readonly viewHeight = VIEW_H;

  protected readonly priceSeries = computed<SparklinePoint[]>(() => {
    const bars = this.candles().filter((bar) => Number.isFinite(bar.c));
    if (bars.length < 2) {
      return [];
    }
    // % change is computed against the true previous close, BEFORE downsampling.
    const points = bars.map((bar, index) => ({
      close: bar.c,
      date: bar.t,
      changePct:
        index > 0 ? ((bar.c - bars[index - 1].c) / bars[index - 1].c) * PERCENT_MULTIPLIER : null,
    }));
    return downsample(points, MAX_POINTS);
  });

  protected readonly lineGeometry = computed(() => {
    const series = this.priceSeries();
    if (series.length < 2) {
      return null;
    }

    const values = series.map((point) => point.close);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, Math.abs(max) * 0.002, 0.01);
    const spanX = VIEW_W - PAD_X * 2;
    const spanY = VIEW_H - PAD_Y * 2;

    const points = series.map((point, index) => {
      const x = PAD_X + (index / (series.length - 1)) * spanX;
      const y = PAD_Y + spanY - ((point.close - min) / range) * spanY;
      return { x, y, value: point.close, date: point.date, changePct: point.changePct };
    });

    const line = `M ${points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}`;
    const last = points[points.length - 1];
    const area = `${line} L ${last.x.toFixed(1)} ${(VIEW_H - 2).toFixed(1)} L ${points[0].x.toFixed(1)} ${(VIEW_H - 2).toFixed(1)} Z`;

    return {
      line,
      area,
      end: last,
      points,
      up: values[values.length - 1] >= values[0],
    };
  });

  /** The hovered line point (viewBox coords + metadata), or `null`. */
  protected readonly hoverPoint = computed(() => {
    const geo = this.lineGeometry();
    const index = this.hoverIndex();
    return geo && index !== null ? (geo.points[index] ?? null) : null;
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

  /**
   * Maps the pointer's x position to the nearest evenly-spaced line point.
   * `getBoundingClientRect` is required — the svg stretches non-uniformly
   * (`preserveAspectRatio="none"` + CSS `width: 100%`), so client px ≠ viewBox units.
   */
  onPointerMove(event: PointerEvent): void {
    if (this.variant() !== 'line') {
      return;
    }
    const geo = this.lineGeometry();
    if (!geo || !(event.currentTarget instanceof Element)) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const viewX = ((event.clientX - rect.left) / rect.width) * VIEW_W;
    const count = geo.points.length;
    const ratio = (viewX - PAD_X) / (VIEW_W - PAD_X * 2);
    const index = Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
    this.hoverIndex.set(index);
  }

  onPointerLeave(): void {
    this.hoverIndex.set(null);
  }

  /** `date · close · ±x.xx%` for the hovered point, locale-formatted. */
  hoverLabel(point: { value: number; date: string; changePct: number | null }): string {
    const tag = LOCALE_TAGS[this.i18n.locale()] ?? this.i18n.locale();
    const date = new Intl.DateTimeFormat(tag, { dateStyle: 'medium' }).format(new Date(point.date));
    const close = point.value.toFixed(2);
    if (point.changePct === null) {
      return `${date} · ${close}`;
    }
    const sign = point.changePct > 0 ? '+' : '';
    return `${date} · ${close} · ${sign}${point.changePct.toFixed(2)}%`;
  }
}

function downsample<T>(values: T[], maxPoints: number): T[] {
  if (values.length <= maxPoints) {
    return values;
  }
  const result: T[] = [];
  const last = values.length - 1;
  for (let i = 0; i < maxPoints; i++) {
    const index = Math.round((i / (maxPoints - 1)) * last);
    result.push(values[index]);
  }
  return result;
}
