import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

let nextUid = 0;

/**
 * Midas logomark — Reiki / prosperity sigil: horizontal axis, central up/down
 * triangles (the core "M"), upper side wings, and the small right lower hook.
 */
@Component({
  selector: 'app-midas-logo',
  standalone: true,
  templateUrl: './midas-logo.component.html',
  styleUrl: './midas-logo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MidasLogoComponent {
  /** Rendered width/height in px. */
  readonly size = input(32);

  /** Unique per-instance id prefix so SVG defs never collide on one page. */
  protected readonly uid = `midas-logo-${nextUid++}`;

  protected readonly viewBox = '0 0 64 64';

  protected readonly strokeWidth = computed(() => {
    const px = this.size();
    if (px <= 24) return 2.6;
    if (px <= 36) return 2.35;
    return 2.1;
  });
}
