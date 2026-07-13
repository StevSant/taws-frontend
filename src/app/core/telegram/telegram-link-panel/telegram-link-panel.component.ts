import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input, OnInit } from '@angular/core';
import { LucideSend } from '@lucide/angular';
import { TranslationService } from '../../i18n';
import { HttpTelegramRepository } from '../http-telegram-repository';
import { SendTestNewsStore } from '../send-test-news-store';
import { TelegramRepository } from '../telegram-repository';
import { TelegramSettingsStore } from '../telegram-settings-store';

@Component({
  selector: 'app-telegram-link-panel',
  standalone: true,
  imports: [DatePipe, LucideSend],
  providers: [
    { provide: TelegramRepository, useClass: HttpTelegramRepository },
    TelegramSettingsStore,
    SendTestNewsStore,
  ],
  templateUrl: './telegram-link-panel.component.html',
  styleUrl: './telegram-link-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelegramLinkPanelComponent implements OnInit {
  @Input() isAuthenticated = false;

  readonly i18n = inject(TranslationService);
  readonly store = inject(TelegramSettingsStore);
  readonly testNews = inject(SendTestNewsStore);

  ngOnInit(): void {
    if (this.isAuthenticated) {
      void this.store.refresh();
    }
  }

  onConnect(): void {
    void this.store.connect();
  }

  onUnlink(): void {
    this.testNews.reset();
    void this.store.unlink();
  }

  onSendTestNews(): void {
    void this.testNews.sendTestNews();
  }
}
