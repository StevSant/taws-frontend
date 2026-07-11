import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MidasLogoComponent } from '../midas-logo/midas-logo.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MidasLogoComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
