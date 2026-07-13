import { TranslationKey } from '../../../core';
import { NewsCategory } from '../domain';

/** i18n keys for each topical news category, reused by the news card and the news filters. */
export const NEWS_CATEGORY_LABEL_KEYS: Record<NewsCategory, TranslationKey> = {
  macro: 'radar.newsCategory.macro',
  earnings: 'radar.newsCategory.earnings',
  regulation: 'radar.newsCategory.regulation',
  crypto: 'radar.newsCategory.crypto',
  mergers_acquisitions: 'radar.newsCategory.mergersAcquisitions',
  geopolitics: 'radar.newsCategory.geopolitics',
  company_news: 'radar.newsCategory.companyNews',
  uncategorized: 'radar.newsCategory.uncategorized',
};
