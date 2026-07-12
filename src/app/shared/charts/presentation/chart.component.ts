import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { ECharts } from 'echarts';
import { ThemeService } from '../../../core';
import { ChartRepository } from '../domain/chart-repository';
import { ChartSpec } from '../domain/chart-spec.model';
import { mapChartSpecToOption } from '../infrastructure/map-chart-spec-to-option';
import { readChartTheme } from '../infrastructure/read-chart-theme';

/**
 * Renders a `ChartSpec` with ECharts and (for time-series charts) offers timeframe buttons
 * that re-request the chart via ChartRepository. The only chart-rendering component in the
 * app. Re-renders on spec/theme change; disposes ECharts on destroy.
 */
@Component({
  selector: 'taws-chart',
  standalone: true,
  templateUrl: './chart.component.html',
  styleUrl: './chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements AfterViewInit, OnDestroy {
  readonly spec = input.required<ChartSpec>();

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('chartHost');
  private readonly themes = inject(ThemeService);
  private readonly charts = inject(ChartRepository);

  /** Live spec: starts as the input, replaced when a timeframe button re-requests. */
  readonly current = signal<ChartSpec | null>(null);
  readonly loading = signal(false);

  private chart?: ECharts;
  private resizeObserver?: ResizeObserver;

  constructor() {
    // Seed/reset the live spec whenever a new input spec arrives.
    effect(() => this.current.set(this.spec()));

    // Re-render on live-spec or theme change.
    effect(() => {
      const spec = this.current();
      this.themes.theme();
      if (this.chart && spec) {
        this.chart.setOption(mapChartSpecToOption(spec, readChartTheme()), true);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const echarts = await import('echarts');
    this.chart = echarts.init(this.host().nativeElement, undefined, { renderer: 'canvas' });
    const spec = this.current();
    if (spec) {
      this.chart.setOption(mapChartSpecToOption(spec, readChartTheme()), true);
    }
    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(this.host().nativeElement);
  }

  async selectTimeframe(timeframe: string): Promise<void> {
    const spec = this.current();
    if (!spec || this.loading() || spec.meta.timeframe === timeframe) {
      return;
    }
    this.loading.set(true);
    try {
      const next = await this.charts.render({ ...spec.meta.request, timeframe });
      this.current.set(next);
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }
}
