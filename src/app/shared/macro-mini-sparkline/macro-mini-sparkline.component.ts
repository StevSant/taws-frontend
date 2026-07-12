import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type MacroSparkTrend = 'up' | 'down' | 'flat';

@Component({
  selector: 'app-macro-mini-sparkline',
  standalone: true,
  templateUrl: './macro-mini-sparkline.component.html',
  styleUrl: './macro-mini-sparkline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MacroMiniSparklineComponent {
  @Input() trend: MacroSparkTrend = 'flat';
}
