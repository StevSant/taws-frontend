import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../../core';
import { AssetClass } from '../../domain';
import { AssetClassSegment } from '../../application/compute-asset-class-segments';
import { ASSET_CLASS_LABEL_KEYS } from '../asset-class-label-keys';

/**
 * Tab bar to segment the radar dashboard by asset class. "Todos" (null) keeps
 * the composition overview; each class tab scopes the aggregates and grid to
 * that class. Purely presentational — the selected class lives in the page.
 */
@Component({
  selector: 'app-radar-asset-class-tabs',
  standalone: true,
  templateUrl: './radar-asset-class-tabs.component.html',
  styleUrl: './radar-asset-class-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarAssetClassTabsComponent {
  @Input({ required: true }) segments: AssetClassSegment[] = [];
  @Input() selected: AssetClass | null = null;
  @Input() totalInstruments = 0;

  @Output() selectionChange = new EventEmitter<AssetClass | null>();

  constructor(readonly i18n: TranslationService) {}

  labelFor(assetClass: AssetClass): string {
    return this.i18n.t(ASSET_CLASS_LABEL_KEYS[assetClass]);
  }

  select(assetClass: AssetClass | null): void {
    if (assetClass === this.selected) {
      return;
    }
    this.selectionChange.emit(assetClass);
  }
}
