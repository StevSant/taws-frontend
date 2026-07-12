import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';
import { mapTelegramLinkStatusDto, mapTelegramLinkTokenDto } from './map-telegram-link-dto';
import { TelegramLinkStatusDto, TelegramLinkTokenDto } from './telegram-link-dto';
import { TelegramLinkStatus } from './telegram-link-status.model';
import { TelegramLinkToken } from './telegram-link-token.model';
import { TelegramRepository } from './telegram-repository';

const TELEGRAM_PATH = '/api/v1/telegram';

@Injectable()
export class HttpTelegramRepository extends TelegramRepository {
  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {
    super();
  }

  async fetchLinkStatus(): Promise<TelegramLinkStatus> {
    const dto = await firstValueFrom(
      this.http.get<TelegramLinkStatusDto>(`${this.config.apiBaseUrl}${TELEGRAM_PATH}/link`),
    );
    return mapTelegramLinkStatusDto(dto);
  }

  async createLinkToken(): Promise<TelegramLinkToken> {
    const dto = await firstValueFrom(
      this.http.post<TelegramLinkTokenDto>(
        `${this.config.apiBaseUrl}${TELEGRAM_PATH}/link-token`,
        {},
      ),
    );
    return mapTelegramLinkTokenDto(dto);
  }

  async unlink(): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.config.apiBaseUrl}${TELEGRAM_PATH}/link`));
  }
}
