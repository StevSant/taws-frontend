import { HttpErrorResponse } from '@angular/common/http';
import { NewsNotificationError } from '../domain';
import { extractNewsNotificationErrorDetail } from './extract-news-notification-error-detail';

/** Converts transport failures into a domain error that the application layer can safely read. */
export function toNewsNotificationError(error: unknown): NewsNotificationError {
  if (error instanceof HttpErrorResponse) {
    const detail = extractNewsNotificationErrorDetail(error.error) ?? error.statusText;
    return new NewsNotificationError(detail || `${error.status}`);
  }
  if (error instanceof Error) {
    return new NewsNotificationError(error.message);
  }
  return new NewsNotificationError('Notification request failed');
}
