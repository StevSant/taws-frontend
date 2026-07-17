/** Wire shape returned by `POST /api/v1/news/{id}/notify`. */
export interface NewsNotificationResponseDto {
  status: 'sent' | 'not_relevant';
  event_title: string;
}
