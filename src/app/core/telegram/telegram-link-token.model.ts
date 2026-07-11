/** Short-lived deep-link token for connecting a Telegram chat. */
export interface TelegramLinkToken {
  token: string;
  deepLinkUrl: string | null;
  expiresAt: Date;
}
