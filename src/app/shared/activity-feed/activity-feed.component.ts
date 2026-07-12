import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface ActivityFeedItem {
  readonly id: string;
  readonly title: string;
  readonly meta: string;
  readonly active?: boolean;
}

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  templateUrl: './activity-feed.component.html',
  styleUrl: './activity-feed.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityFeedComponent {
  readonly title = input.required<string>();
  readonly items = input.required<readonly ActivityFeedItem[]>();
  readonly emptyLabel = input.required<string>();

  readonly select = output<string>();

  onSelect(id: string): void {
    this.select.emit(id);
  }
}
