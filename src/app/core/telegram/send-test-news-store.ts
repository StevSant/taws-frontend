import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from '../config/app-config.service';
import { SendTestNewsResponse } from './send-test-news-response.model';

@Injectable()
export class SendTestNewsStore {
  private readonly resultSignal = signal<SendTestNewsResponse | null>(null);
  private readonly isPendingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly result = this.resultSignal.asReadonly();
  readonly isPending = this.isPendingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  constructor(
    private readonly http: HttpClient,
    private readonly config: AppConfigService,
  ) {}

  async sendTestNews(): Promise<void> {
    this.isPendingSignal.set(true);
    this.errorSignal.set(null);
    this.resultSignal.set(null);
    try {
      const dto = await firstValueFrom(
        this.http.post<{ status: string; event_title: string }>(
          `${this.config.apiBaseUrl}/api/v1/telegram/send-test-news`,
          {},
        ),
      );
      this.resultSignal.set({ status: dto.status, eventTitle: dto.event_title });
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
      return error.error?.detail ?? 'Error al enviar la noticia de prueba. Intenta de nuevo.';
    }
    return 'Ocurrió un error al enviar la noticia de prueba. Intenta de nuevo.';
  }
}
