import { PercentPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ASSET_CLASSES, AssetClass, ImpactDirection, ScenarioAssetClassImpact } from '../../domain';
import { TranslationKey, TranslationService } from '../../../../core';

const ASSET_CLASS_LABELS: Record<AssetClass, TranslationKey> = {
  stock: 'scenarios.assetClass.stock',
  crypto: 'scenarios.assetClass.crypto',
  credit: 'scenarios.assetClass.credit',
  commodity: 'scenarios.assetClass.commodity',
  forex: 'scenarios.assetClass.forex',
};

const DIRECTION_LABEL_KEYS: Record<ImpactDirection, TranslationKey> = {
  positive: 'scenarios.result.impact.direction.positive',
  negative: 'scenarios.result.impact.direction.negative',
  neutral: 'scenarios.result.impact.direction.neutral',
  uncertain: 'scenarios.result.impact.direction.uncertain',
};

/** Compact non-color glyph per direction — the colorblind-safe fallback
 * alongside the (already-safe) text label, per issue #20's accessibility
 * note ("not color alone"). */
const DIRECTION_SYMBOLS: Record<ImpactDirection, string> = {
  positive: '▲',
  negative: '▼',
  neutral: '●',
  uncertain: '?',
};

/** One heatmap cell: an asset class paired with its impact, or `null` when
 * the scenario doesn't assess that class at all. */
export interface ImpactHeatmapCell {
  assetClass: AssetClass;
  impact: ScenarioAssetClassImpact | null;
}

/** Cell background tint floor/ceiling — kept visible even at 0 confidence
 * (floor) so an assessed-but-low-confidence cell still reads as "assessed",
 * distinct from an unassessed (0-opacity) cell. */
const TINT_OPACITY_FLOOR = 0.18;
const TINT_OPACITY_RANGE = 0.55;

/**
 * Per-asset-class impact heatmap (issue #20). Renders all five
 * `AssetClass` values from the curated universe as cells — asset classes
 * the scenario doesn't touch (no entry in `impactMap`, see issue #12's
 * `affectedAssetClasses`) render as dimmed/empty "not assessed" cells
 * rather than being omitted, so the grid always represents the full
 * universe even though most scenarios only light up one or two cells.
 *
 * Direction is encoded redundantly (background tint color + glyph + text
 * label) so it's never color-alone; confidence is encoded as both tint
 * opacity and an explicit percentage badge.
 */
@Component({
  selector: 'app-impact-heatmap',
  standalone: true,
  imports: [PercentPipe],
  templateUrl: './impact-heatmap.component.html',
  styleUrl: './impact-heatmap.component.scss',
})
export class ImpactHeatmapComponent {
  @Input({ required: true }) impactMap: ScenarioAssetClassImpact[] = [];

  constructor(readonly i18n: TranslationService) {}

  get cells(): ImpactHeatmapCell[] {
    return ASSET_CLASSES.map((assetClass) => ({
      assetClass,
      impact: this.impactMap.find((entry) => entry.assetClass === assetClass) ?? null,
    }));
  }

  assetClassLabel(assetClass: AssetClass): string {
    return this.i18n.t(ASSET_CLASS_LABELS[assetClass]);
  }

  directionLabel(direction: ImpactDirection): string {
    return this.i18n.t(DIRECTION_LABEL_KEYS[direction]);
  }

  directionSymbol(direction: ImpactDirection): string {
    return DIRECTION_SYMBOLS[direction];
  }

  /** Tint opacity for a cell's fill layer — 0 when unassessed, otherwise
   * scaled by confidence within a visible floor/range. */
  tintOpacity(cell: ImpactHeatmapCell): number {
    if (!cell.impact) {
      return 0;
    }
    return TINT_OPACITY_FLOOR + cell.impact.confidence * TINT_OPACITY_RANGE;
  }

  cellTooltip(cell: ImpactHeatmapCell): string {
    if (!cell.impact) {
      return `${this.assetClassLabel(cell.assetClass)} — ${this.i18n.t('scenarios.result.heatmap.notAssessed')}`;
    }
    const confidence = Math.round(cell.impact.confidence * 100);
    return `${this.assetClassLabel(cell.assetClass)} — ${this.directionLabel(cell.impact.direction)} (${confidence}%)`;
  }
}
