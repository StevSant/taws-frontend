/** A notification request failed before the backend could return an alert outcome. */
export class NewsNotificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NewsNotificationError';
  }
}
