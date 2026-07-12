import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NeuralOrbComponent } from '../neural-orb/neural-orb.component';
import { MidasGlyphId } from './midas-glyph.model';

let nextUid = 0;

@Component({
  selector: 'app-midas-glyph',
  standalone: true,
  imports: [NeuralOrbComponent],
  templateUrl: './midas-glyph.component.html',
  styleUrl: './midas-glyph.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MidasGlyphComponent {
  readonly glyph = input.required<MidasGlyphId>();
  readonly size = input(48);
  readonly animated = input(true);

  protected readonly uid = `midas-glyph-${nextUid++}`;

  protected isNeuralOrb(id: MidasGlyphId): boolean {
    return id === 'brand-neural-orb';
  }
}
