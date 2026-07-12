import { Injectable } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import {
  AppConfigService,
  NewSignalsTracker,
  NotificationsStore,
  RequestCacheService,
} from '../../../core';
import { DEFAULT_RADAR_FILTERS, NewsRepository } from '../domain';
import { formatNewNewsNotificationDetail } from './format-new-signals-detail';

/**
 * Polls `/api/v1/news` from the shell so bell notifications fire on every page,
 * not only while Radar is open. Started once by `ShellComponent`.
 */
@Injectable({ providedIn: 'root' })
export class RadarNewsNotificationPoller {
  private subscription: Subscription | null = null;

  constructor(
    private readonly newsRepository: NewsRepository,
    private readonly config: AppConfigService,
    private readonly notifications: NotificationsStore,
    private readonly tracker: NewSignalsTracker,
    private readonly requestCache: RequestCacheService,
  ) {}

  start(): void {
    if (this.subscription) {
      return;
    }

    void this.poll();
    this.subscription = interval(this.config.radarPollIntervalMs).subscribe(() => void this.poll());
  }

  private async poll(): Promise<void> {
    try {
      const cacheKey = JSON.stringify(DEFAULT_RADAR_FILTERS);
      this.requestCache.delete('news', cacheKey);

      const news = await this.newsRepository.fetchNews(DEFAULT_RADAR_FILTERS);
      const newItems = this.tracker.detectNew(news);

      if (newItems.length === 0) {
        return;
      }

      const latestNewsId = newItems[0]?.id;
      this.notifications.notify(
        'radar',
        'notifications.radar.newSignals',
        newItems.length,
        formatNewNewsNotificationDetail(newItems),
        latestNewsId
          ? { commands: ['/radar/news', latestNewsId] }
          : { commands: ['/radar'] },
      );
    } catch {
      // Background poll — never surface errors in the shell.
    }
  }
}
