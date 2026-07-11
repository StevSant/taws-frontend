export interface TelegramLinkStatusDto {
  linked: boolean;
  linked_at: string | null;
}

export interface TelegramLinkTokenDto {
  token: string;
  deep_link_url: string | null;
  expires_at: string;
}
