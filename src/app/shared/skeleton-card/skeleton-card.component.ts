import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  templateUrl: './skeleton-card.component.html',
  styleUrl: './skeleton-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonCardComponent {
  readonly lines = input(3);

  lineIndexes(): number[] {
    return Array.from({ length: this.lines() }, (_, index) => index);
  }
}
