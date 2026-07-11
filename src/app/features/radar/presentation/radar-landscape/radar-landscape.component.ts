import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { ASSET_CLASSES, AssetClass, ImpactClass, MacroState } from '../../domain';
import { RadarLandscape } from '../../application/compute-radar-landscape';
import { ImpactDistributionChartComponent } from '../impact-distribution-chart/impact-distribution-chart.component';
import { RadarMacroStripComponent } from '../radar-macro-strip/radar-macro-strip.component';

const ASSET_CLASS_LABELS: Record<AssetClass, TranslationKey> = {
  stock: 'radar.assetClass.stock',
  crypto: 'radar.assetClass.crypto',
  credit: 'radar.assetClass.credit',
  commodity: 'radar.assetClass.commodity',
  forex: 'radar.assetClass.forex',
};

const IMPACT_LABELS: Record<ImpactClass | 'unclassified', TranslationKey> = {
  positive: 'radar.landscape.positive',
  negative: 'radar.landscape.negative',
  neutral: 'radar.landscape.neutral',
  uncertain: 'radar.landscape.uncertain',
  unclassified: 'radar.landscape.unclassified',
};

@Component({
  selector: 'app-radar-landscape',
  standalone: true,
  imports: [ImpactDistributionChartComponent, RadarMacroStripComponent],
  templateUrl: './radar-landscape.component.html',
  styleUrl: './radar-landscape.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarLandscapeComponent {
  @Input({ required: true }) landscape!: RadarLandscape;
  @Input() macro: MacroState | null = null;
  @Input() activeAssetClass: AssetClass | null = null;

  @Output() readonly assetClassFilter = new EventEmitter<AssetClass>();

  readonly assetClasses = ASSET_CLASSES;

  constructor(readonly i18n: TranslationService) {}

  cellFor(assetClass: AssetClass) {
    return this.landscape.assetClasses.find((cell) => cell.assetClass === assetClass) ?? null;
  }

  assetClassLabel(assetClass: AssetClass): string {
    return this.i18n.t(ASSET_CLASS_LABELS[assetClass]);
  }

  impactClass(assetClass: AssetClass): ImpactClass | 'unclassified' | null {
    return this.cellFor(assetClass)?.dominantImpact ?? null;
  }

  impactLabel(impact: ImpactClass | 'unclassified' | null): string {
    if (!impact) {
      return '—';
    }
    return this.i18n.t(IMPACT_LABELS[impact]);
  }

  onAssetClassClick(assetClass: AssetClass): void {
    this.assetClassFilter.emit(assetClass);
  }
}
