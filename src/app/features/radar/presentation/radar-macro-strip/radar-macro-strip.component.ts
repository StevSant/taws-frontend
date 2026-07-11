import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { MacroState } from '../../domain';

const VIX_ARC_LENGTH = 106.8;
const VIX_MAX = 40;

@Component({
  selector: 'app-radar-macro-strip',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './radar-macro-strip.component.html',
  styleUrl: './radar-macro-strip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarMacroStripComponent {
  @Input() macro: MacroState | null = null;

  constructor(readonly i18n: TranslationService) {}

  regimeLabel(regime: string): string {
    return this.i18n.t(`radar.landscape.regime.${regime}` as TranslationKey);
  }

  vixDash(): string {
    const level = this.macro?.volatility.vixLevel ?? 0;
    const filled = Math.min(level / VIX_MAX, 1) * VIX_ARC_LENGTH;
    return `${filled} ${VIX_ARC_LENGTH}`;
  }

  ratesBarWidth(): number {
    const value = this.macro?.rates.value ?? 0;
    return Math.min((value / 8) * 100, 100);
  }

  cpiBarWidth(): number {
    const value = this.macro?.cpi.value ?? 0;
    return Math.min((value / 10) * 100, 100);
  }
}
