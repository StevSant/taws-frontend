import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const USAGE_PERCENT_MIN = 0;
const USAGE_PERCENT_MAX = 100;

@Component({
  selector: 'app-plan-usage-widget',
  standalone: true,
  templateUrl: './plan-usage-widget.component.html',
  styleUrl: './plan-usage-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlanUsageWidgetComponent {
  readonly planName = input.required<string>();
  readonly planStatusLabel = input.required<string>();
  readonly usageLabel = input.required<string>();
  readonly usagePercent = input.required<number>();
  readonly resetHint = input.required<string>();

  readonly clampedUsagePercent = computed(() =>
    Math.min(USAGE_PERCENT_MAX, Math.max(USAGE_PERCENT_MIN, this.usagePercent())),
  );
}
