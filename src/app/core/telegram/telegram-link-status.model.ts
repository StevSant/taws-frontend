/** Whether the authenticated user has a linked Telegram chat. */
export interface TelegramLinkStatus {
  linked: boolean;
  linkedAt: Date | null;
}
