/** Result of assessing one news item for a Telegram alert. */
export interface NewsNotificationResult {
  status: 'sent' | 'not_relevant';
  eventTitle: string;
}
