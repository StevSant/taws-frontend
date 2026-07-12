import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MacroMiniSparklineComponent } from '../../../../shared';
import { TranslationService } from '../../../../core';
import { MacroState } from '../../domain';
import { VolatilityRegimeLevel } from '../../domain/models/market-stats.model';

@Component({
  selector: 'app-radar-macro-cards',
  standalone: true,
  imports: [DecimalPipe, MacroMiniSparklineComponent],
  templateUrl: './radar-macro-cards.component.html',
  styleUrl: './radar-macro-cards.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarMacroCardsComponent {
  @Input() macro: MacroState | null = null;

  readonly dxyValue = 104.21;
  readonly dxyDelta = 0.32;

  constructor(readonly i18n: TranslationService) {}

  regimeLabel(regime: VolatilityRegimeLevel): string {
    const keys = {
      low: 'radar.landscape.regime.low',
      normal: 'radar.landscape.regime.normal',
      elevated: 'radar.landscape.regime.elevated',
      high: 'radar.landscape.regime.high',
    } as const;
    return this.i18n.t(keys[regime]);
  }
}
