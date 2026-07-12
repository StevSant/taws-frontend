import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslationService } from '../../../../core';
import { AssetClassSegment } from '../../application/compute-asset-class-segments';
import { ASSET_CLASS_LABEL_KEYS } from '../asset-class-label-keys';
import { RadarMarketPulseComponent } from '../radar-market-pulse/radar-market-pulse.component';
import { RadarMarketScoreComponent } from '../radar-market-score/radar-market-score.component';

/**
 * Aggregates for a single asset class: a titled panel wrapping that class's own
 * market pulse (impact distribution) and market score. Reuses the existing
 * pulse/score components with the segment's isolated aggregates (issue #41).
 */
@Component({
  selector: 'app-radar-asset-class-section',
  standalone: true,
  imports: [RadarMarketPulseComponent, RadarMarketScoreComponent],
  templateUrl: './radar-asset-class-section.component.html',
  styleUrl: './radar-asset-class-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarAssetClassSectionComponent {
  @Input({ required: true }) segment!: AssetClassSegment;

  constructor(readonly i18n: TranslationService) {}

  get label(): string {
    return this.i18n.t(ASSET_CLASS_LABEL_KEYS[this.segment.assetClass]);
  }
}
