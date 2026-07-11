import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface FeaturePageStat {
  label: string;
  value: string;
}

@Component({
  selector: 'app-feature-page-header',
  standalone: true,
  templateUrl: './feature-page-header.component.html',
  styleUrl: './feature-page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturePageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly stats = input<FeaturePageStat[]>([]);
}
