import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationKey, TranslationService } from '../../../../core';
import {
  ASSET_CLASSES,
  AssetClass,
  Instrument,
  RadarFilters,
  RECENCY_OPTIONS_HOURS,
} from '../../domain';

const ASSET_CLASS_LABELS: Record<AssetClass, TranslationKey> = {
  stock: 'radar.assetClass.stock',
  crypto: 'radar.assetClass.crypto',
  credit: 'radar.assetClass.credit',
  commodity: 'radar.assetClass.commodity',
  forex: 'radar.assetClass.forex',
};

const RECENCY_LABELS: Record<number, TranslationKey> = {
  24: 'radar.filters.recency.24h',
  48: 'radar.filters.recency.48h',
  168: 'radar.filters.recency.168h',
  720: 'radar.filters.recency.720h',
};

/**
 * Presentational filter bar: instrument type (asset class), asset
 * (instrument symbol, scoped to the selected type), and recency. Pure
 * input/output — `RadarPageComponent` owns the actual filter state via
 * `RadarStore` and re-fetches on every change.
 */
@Component({
  selector: 'app-radar-filters',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './radar-filters.component.html',
  styleUrl: './radar-filters.component.scss',
})
export class RadarFiltersComponent {
  @Input({ required: true }) filters!: RadarFilters;
  @Input() instrumentOptions: Instrument[] = [];

  @Output() assetClassChange = new EventEmitter<AssetClass | null>();
  @Output() symbolChange = new EventEmitter<string | null>();
  @Output() sinceHoursChange = new EventEmitter<number>();

  readonly assetClasses = ASSET_CLASSES;
  readonly recencyOptions = RECENCY_OPTIONS_HOURS;

  constructor(readonly i18n: TranslationService) {}

  assetClassLabel(assetClass: AssetClass): string {
    return this.i18n.t(ASSET_CLASS_LABELS[assetClass]);
  }

  recencyLabel(hours: number): string {
    const key = RECENCY_LABELS[hours];
    return key ? this.i18n.t(key) : `${hours}h`;
  }
}
