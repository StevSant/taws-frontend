import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';
import { RegisterBotDto } from './register-bot-dto';
import { RegisterBotResponse } from './register-bot-response.model';
import { mapRegisterBotDto } from './map-register-bot-dto';

@Injectable()
export class BotRegistrationStore {
  private readonly resultSignal = signal<RegisterBotResponse | null>(null);
  private readonly isPendingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly result = this.resultSignal.asReadonly();
  readonly isPending = this.isPendingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {}

  async register(botfatherText: string): Promise<void> {
    this.isPendingSignal.set(true);
    this.errorSignal.set(null);
    this.resultSignal.set(null);
    try {
      const dto = await firstValueFrom(
        this.http.post<RegisterBotDto>(`${this.config.apiBaseUrl}/api/v1/telegram/register-bot`, {
          botfather_text: botfatherText,
        }),
      );
      this.resultSignal.set(mapRegisterBotDto(dto));
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isPendingSignal.set(false);
    }
  }

  reset(): void {
    this.resultSignal.set(null);
    this.isPendingSignal.set(false);
    this.errorSignal.set(null);
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 400) {
      return error.error?.detail ?? 'Error al registrar el bot. Intenta de nuevo.';
    }
    return 'Ocurrió un error al registrar el bot. Intenta de nuevo.';
  }
}
