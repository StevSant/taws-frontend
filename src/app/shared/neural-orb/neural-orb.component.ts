import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextUid = 0;

/**
 * Small glowing neural-mesh logomark. Pure SVG + CSS animation (no Three.js,
 * no JS render loop) — a pentagon of satellite nodes wired to a pulsing
 * core, wrapped in a slowly rotating dashed ring.
 */
@Component({
  selector: 'app-neural-orb',
  standalone: true,
  templateUrl: './neural-orb.component.html',
  styleUrl: './neural-orb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NeuralOrbComponent {
  /** Rendered width/height in px. */
  readonly size = input(40);

  /** Unique per-instance id prefix so SVG defs never collide on one page. */
  protected readonly uid = `neural-orb-${nextUid++}`;

  protected readonly nodes = [
    { x: 20, y: 6 },
    { x: 33.31, y: 15.67 },
    { x: 28.23, y: 31.33 },
    { x: 11.77, y: 31.33 },
    { x: 6.69, y: 15.67 },
  ];

  /** Pentagon edges connecting adjacent satellite nodes (mesh look). */
  protected readonly edges = this.nodes.map((node, index) => ({
    x1: node.x,
    y1: node.y,
    x2: this.nodes[(index + 1) % this.nodes.length].x,
    y2: this.nodes[(index + 1) % this.nodes.length].y,
  }));
}
