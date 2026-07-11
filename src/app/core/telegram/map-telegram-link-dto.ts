import { TelegramLinkStatusDto, TelegramLinkTokenDto } from './telegram-link-dto';
import { TelegramLinkStatus } from './telegram-link-status.model';
import { TelegramLinkToken } from './telegram-link-token.model';

export function mapTelegramLinkStatusDto(dto: TelegramLinkStatusDto): TelegramLinkStatus {
  return {
    linked: dto.linked,
    linkedAt: dto.linked_at ? new Date(dto.linked_at) : null,
  };
}

export function mapTelegramLinkTokenDto(dto: TelegramLinkTokenDto): TelegramLinkToken {
  return {
    token: dto.token,
    deepLinkUrl: dto.deep_link_url,
    expiresAt: new Date(dto.expires_at),
  };
}
