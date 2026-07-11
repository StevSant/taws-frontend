import { Injectable, signal } from '@angular/core';
import { TelegramLinkStatus } from './telegram-link-status.model';
import { TelegramLinkToken } from './telegram-link-token.model';
import { TelegramRepository } from './telegram-repository';

@Injectable()
export class TelegramSettingsStore {
  private readonly statusSignal = signal<TelegramLinkStatus | null>(null);
  private readonly pendingTokenSignal = signal<TelegramLinkToken | null>(null);
  private readonly isLoadingSignal = signal(false);
  private readonly isActionPendingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly status = this.statusSignal.asReadonly();
  readonly pendingToken = this.pendingTokenSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isActionPending = this.isActionPendingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  constructor(private readonly telegramRepository: TelegramRepository) {}

  async refresh(): Promise<void> {
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const status = await this.telegramRepository.fetchLinkStatus();
      this.statusSignal.set(status);
      if (status.linked) {
        this.pendingTokenSignal.set(null);
      }
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      this.statusSignal.set(null);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async connect(): Promise<void> {
    this.isActionPendingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const token = await this.telegramRepository.createLinkToken();
      this.pendingTokenSignal.set(token);
      if (token.deepLinkUrl) {
        window.open(token.deepLinkUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isActionPendingSignal.set(false);
    }
  }

  async unlink(): Promise<void> {
    this.isActionPendingSignal.set(true);
    this.errorSignal.set(null);
    try {
      await this.telegramRepository.unlink();
      this.statusSignal.set({ linked: false, linkedAt: null });
      this.pendingTokenSignal.set(null);
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isActionPendingSignal.set(false);
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Telegram request failed';
  }
}
