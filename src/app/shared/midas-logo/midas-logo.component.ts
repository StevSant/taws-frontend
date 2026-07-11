import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NeuralOrbComponent } from '../neural-orb/neural-orb.component';

/**
 * Midas brand mark — the neural-mesh orb (pentagon nodes + pulsing core).
 * Shared between header, login, and the static favicon export.
 */
@Component({
  selector: 'app-midas-logo',
  standalone: true,
  imports: [NeuralOrbComponent],
  template: `
    <span class="midas-logo" role="img" aria-label="Midas">
      <app-neural-orb [size]="size()" />
    </span>
  `,
  styleUrl: './midas-logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MidasLogoComponent {
  readonly size = input(32);
}
