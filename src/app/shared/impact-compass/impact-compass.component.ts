import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ImpactClass } from '../../features/radar/domain';

@Component({
  selector: 'app-impact-compass',
  standalone: true,
  templateUrl: './impact-compass.component.html',
  styleUrl: './impact-compass.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpactCompassComponent {
  readonly impact = input<ImpactClass | 'unclassified' | null>('unclassified');
  readonly size = input(88);

  protected readonly rotation = computed(() => {
    switch (this.impact()) {
      case 'positive':
        return -45;
      case 'negative':
        return 135;
      case 'neutral':
        return 90;
      case 'uncertain':
        return 0;
      default:
        return 45;
    }
  });
}
