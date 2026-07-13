import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { AppConfigService, TranslationService } from '../../../core';
import { NewsItem } from '../domain';

interface BlurbSourceDto {
  id: string;
  title: string;
  summary: string;
}

interface LocalizeBlurbsResponseDto {
  items: Array<{ id: string; blurb: string }>;
}

const BLURBS_PATH = '/api/v1/news/blurbs';
const REQUEST_TIMEOUT_MS = 20_000;

/** Session-cached locale-aware blurbs for news cards and detail pages. */
@Injectable({ providedIn: 'root' })
export class NewsBlurbService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfigService);
  private readonly i18n = inject(TranslationService);

  private readonly cacheSignal = signal<Record<string, string>>({});
  private readonly inflight = new Set<string>();

  readonly blurbs = this.cacheSignal.asReadonly();

  blurbFor(news: NewsItem): string | null {
    const cached = this.cacheSignal()[this.cacheKey(news.id, this.i18n.locale())];
    if (cached) {
      return cached;
    }
    const fallback = stripHtml(news.summary).trim();
    return fallback || null;
  }

  ensureBlurbs(newsItems: NewsItem[]): void {
    const locale = this.i18n.locale();

    const missing = newsItems.filter((item) => {
      const key = this.cacheKey(item.id, locale);
      if (!item.id || this.cacheSignal()[key] || this.inflight.has(key)) {
        return false;
      }
      return Boolean(item.title?.trim());
    });

    if (missing.length === 0) {
      return;
    }

    for (const item of missing) {
      this.inflight.add(this.cacheKey(item.id, locale));
    }

    void this.fetchBlurbs(missing, locale)
      .catch(() => undefined)
      .finally(() => {
        for (const item of missing) {
          this.inflight.delete(this.cacheKey(item.id, locale));
        }
      });
  }

  private async fetchBlurbs(items: NewsItem[], locale: string): Promise<void> {
    const payload = {
      locale,
      items: items.slice(0, 12).map((item): BlurbSourceDto => ({
        id: item.id,
        title: item.title.slice(0, 500),
        summary: stripHtml(item.summary).slice(0, 4000),
      })),
    };

    const response = await firstValueFrom(
      this.http
        .post<LocalizeBlurbsResponseDto>(`${this.config.apiBaseUrl}${BLURBS_PATH}`, payload)
        .pipe(timeout(REQUEST_TIMEOUT_MS)),
    );

    if (!response?.items?.length) {
      return;
    }

    this.cacheSignal.update((current) => {
      const next = { ...current };
      for (const row of response.items) {
        if (row.id && row.blurb?.trim()) {
          next[this.cacheKey(row.id, locale)] = row.blurb.trim();
        }
      }
      return next;
    });
  }

  private cacheKey(newsId: string, locale: string): string {
    return `${locale}:${newsId}`;
  }
}

function stripHtml(value: string | undefined): string {
  return (value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
