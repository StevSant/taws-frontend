import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UnusualMove } from '../../features/radar/domain';

@Component({
  selector: 'app-return-sparkline',
  standalone: true,
  templateUrl: './return-sparkline.component.html',
  styleUrl: './return-sparkline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReturnSparklineComponent {
  readonly moves = input<UnusualMove[]>([]);
  readonly width = input(220);
  readonly height = input(56);

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

  formatTooltip(move: UnusualMove): string {
    const sign = move.returnPct > 0 ? '+' : '';
    const date = move.date ? new Date(move.date).toLocaleDateString() : '';
    const z = move.zScore !== undefined && move.zScore !== null ? ` · z=${move.zScore.toFixed(1)}` : '';
    return `${date}: ${sign}${move.returnPct.toFixed(2)}%${z}`;
  }
}
