import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core';
import { EmptyStateComponent, PriceDeltaChipComponent, SpinnerComponent } from '../../../../shared';
import { ChartComponent, ChartSpec } from '../../../../shared/charts';
import { buildMacroLineSpec, MacroDetailStore } from '../../application';
import { MACRO_INDICATORS, MACRO_RANGE_OPTIONS_DAYS, MacroIndicator } from '../../domain';
import { macroIndicatorDescriptor, MacroValueFormat } from '../macro-indicator-catalog';
import { formatMacroValue, periodChangePct } from '../format-macro-value';
import { navigateDetailBack } from '../navigate-detail-back';

function isMacroIndicator(value: string | null): value is MacroIndicator {
  return value !== null && (MACRO_INDICATORS as readonly string[]).includes(value);
}

/**
 * Macro indicator detail view (`radar/macro/:indicator`, issue #58). Renders the indicator's
 * full history as an interactive ECharts line chart (native hover crosshair tooltip) with a
 * time-range selector, latest/high/low/change stats, and the plain-language explanation.
 *
 * The "AI analysis" sub-item of the acceptance criteria is deferred: the only macro AI source
 * (`POST /api/v1/macro/interpret`) interprets the overall macro state / an event across asset
 * classes, not a single indicator's history, so there is no per-indicator analysis endpoint to
 * wire. A documented note is shown in place; see the PR body.
 */
@Component({
  selector: 'app-macro-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    ChartComponent,
    SpinnerComponent,
    EmptyStateComponent,
    PriceDeltaChipComponent,
  ],
  templateUrl: './macro-detail-page.component.html',
  styleUrl: './macro-detail-page.component.scss',
  providers: [MacroDetailStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MacroDetailPageComponent {
  readonly store = inject(MacroDetailStore);
  readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly rangeOptions = MACRO_RANGE_OPTIONS_DAYS;

  readonly descriptor = computed(() => {
    const indicator = this.store.indicator();
    return indicator ? macroIndicatorDescriptor(indicator) : null;
  });

  readonly format = computed<MacroValueFormat>(() => this.descriptor()?.format ?? 'percent');

  readonly title = computed(() => {
    const descriptor = this.descriptor();
    return descriptor ? this.i18n.t(descriptor.labelKey) : '';
  });

  readonly explanation = computed(() => {
    const descriptor = this.descriptor();
    return descriptor ? this.i18n.t(descriptor.explanationKey) : '';
  });

  readonly values = computed<number[]>(
    () => this.store.currentSeries()?.observations.map((observation) => observation.value) ?? [],
  );

  readonly latestLabel = computed(() =>
    formatMacroValue(this.store.currentSeries()?.latest?.value ?? null, this.format()),
  );

  readonly highLabel = computed(() => {
    const values = this.values();
    return values.length > 0 ? formatMacroValue(Math.max(...values), this.format()) : '—';
  });

  readonly lowLabel = computed(() => {
    const values = this.values();
    return values.length > 0 ? formatMacroValue(Math.min(...values), this.format()) : '—';
  });

  readonly changePct = computed(() => periodChangePct(this.values()));

  readonly spec = computed<ChartSpec | null>(() => {
    const series = this.store.currentSeries();
    if (!series || series.observations.length === 0) {
      return null;
    }
    return buildMacroLineSpec(this.title(), series);
  });

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const indicator = params.get('indicator');
      if (isMacroIndicator(indicator)) {
        void this.store.load(indicator);
      }
    });
  }

  onSelectRange(days: number): void {
    void this.store.setRange(days);
  }

  onBack(event: MouseEvent): void {
    navigateDetailBack(this.router, this.location, '/radar', event);
  }
}
