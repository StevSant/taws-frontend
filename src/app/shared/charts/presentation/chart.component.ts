import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type { ECharts } from 'echarts';
import { ThemeService } from '../../../core';
import { ChartSpec } from '../domain/chart-spec.model';
import { mapChartSpecToOption } from '../infrastructure/map-chart-spec-to-option';
import { readChartTheme } from '../infrastructure/read-chart-theme';

/**
 * Renders a library-agnostic `ChartSpec` with ECharts. The only chart-rendering component
 * in the app; features pass a `ChartSpec` and never touch ECharts. Re-renders whenever the
 * `spec` input or the theme signal changes; disposes the ECharts instance on destroy.
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

  private chart?: ECharts;
  private resizeObserver?: ResizeObserver;

  constructor() {
    // Re-render on spec or theme change (no-op until the chart is initialized).
    effect(() => {
      const spec = this.spec();
      this.themes.theme();
      if (this.chart) {
        this.chart.setOption(mapChartSpecToOption(spec, readChartTheme()), true);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const echarts = await import('echarts');
    this.chart = echarts.init(this.host().nativeElement, undefined, { renderer: 'canvas' });
    this.chart.setOption(mapChartSpecToOption(this.spec(), readChartTheme()), true);

    this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
    this.resizeObserver.observe(this.host().nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }
}
