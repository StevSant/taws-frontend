import { NewsNotificationResult } from '../domain';
import { NewsNotificationResponseDto } from './news-notification-response-dto';

/** Maps the Telegram-alert response from snake_case transport data to the domain model. */
export function mapNewsNotificationResponseDto(
  dto: NewsNotificationResponseDto,
): NewsNotificationResult {
  return { status: dto.status, eventTitle: dto.event_title };
}
