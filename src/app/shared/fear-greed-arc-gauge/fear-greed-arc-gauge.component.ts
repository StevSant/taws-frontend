import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RADIUS = 72;
const ARC_LENGTH = Math.PI * RADIUS;

@Component({
  selector: 'app-fear-greed-arc-gauge',
  standalone: true,
  templateUrl: './fear-greed-arc-gauge.component.html',
  styleUrl: './fear-greed-arc-gauge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FearGreedArcGaugeComponent {
  readonly value = input(50);
  readonly label = input('Neutral');

  protected readonly radius = RADIUS;
  protected readonly arcLength = ARC_LENGTH;

  protected readonly clampedValue = computed(() =>
    Math.min(100, Math.max(0, this.value())),
  );

  protected readonly needleOffset = computed(
    () => ARC_LENGTH - (this.clampedValue() / 100) * ARC_LENGTH,
  );

  protected readonly tone = computed(() => {
    const score = this.clampedValue();
    if (score <= 25) {
      return 'fear';
    }
    if (score >= 75) {
      return 'greed';
    }
    if (score >= 55) {
      return 'greed-soft';
    }
    if (score <= 45) {
      return 'fear-soft';
    }
    return 'neutral';
  });
}
