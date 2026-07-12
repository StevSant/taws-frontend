import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MidasGlyphComponent } from '../midas-glyph/midas-glyph.component';
import { MIDAS_BRAND_GLYPH } from '../midas-glyph/midas-glyph-selection';

@Component({
  selector: 'app-midas-logo',
  standalone: true,
  imports: [MidasGlyphComponent],
  template: `
    <span class="midas-logo" role="img" aria-label="Midas">
      <app-midas-glyph [glyph]="brandGlyph" [size]="size()" [animated]="animated()" />
    </span>
  `,
  styleUrl: './midas-logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MidasLogoComponent {
  readonly size = input(32);
  readonly animated = input(true);

  protected readonly brandGlyph = MIDAS_BRAND_GLYPH;
}
