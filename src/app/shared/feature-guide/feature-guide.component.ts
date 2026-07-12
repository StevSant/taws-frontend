import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-feature-guide',
  standalone: true,
  templateUrl: './feature-guide.component.html',
  styleUrl: './feature-guide.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureGuideComponent {
  readonly title = input.required<string>();
  readonly steps = input.required<readonly string[]>();
}
