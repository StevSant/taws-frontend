import { TranslationKey } from '../i18n';
import { NotificationLink } from './notification.model';

/** In-app destination for a bell notification (never an external URL). */
export function resolveNotificationLink(
  messageKey: TranslationKey,
  detail?: string,
): NotificationLink | undefined {
  switch (messageKey) {
    case 'notifications.radar.newSignals':
      return { commands: ['/radar'] };
    case 'notifications.radar.signalGenerated':
      return detail
        ? { commands: ['/radar'], queryParams: { symbol: detail } }
        : { commands: ['/radar'] };
    case 'notifications.briefing.generated':
      return { commands: ['/briefings'] };
    case 'notifications.auth.sessionExpired':
      return { commands: ['/login'] };
    default:
      return undefined;
  }
}
