import { TelegramLinkStatus } from './telegram-link-status.model';
import { TelegramLinkToken } from './telegram-link-token.model';

/** Port for Telegram account linking (issue #14). */
export abstract class TelegramRepository {
  abstract fetchLinkStatus(): Promise<TelegramLinkStatus>;
  abstract createLinkToken(): Promise<TelegramLinkToken>;
  abstract unlink(): Promise<void>;
}
