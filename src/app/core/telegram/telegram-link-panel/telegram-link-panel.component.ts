import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnInit,
  signal,
} from '@angular/core';
import { LucideSend } from '@lucide/angular';
import { TranslationService } from '../../i18n';
import { TelegramSettingsStore } from '../telegram-settings-store';

@Component({
  selector: 'app-telegram-link-panel',
  standalone: true,
  imports: [DatePipe, LucideSend],
  templateUrl: './telegram-link-panel.component.html',
  styleUrl: './telegram-link-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TelegramLinkPanelComponent implements OnInit {
  @Input() isAuthenticated = false;

  readonly i18n = inject(TranslationService);
  readonly store = inject(TelegramSettingsStore);

  readonly isOpen = signal(false);

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    if (this.isAuthenticated) {
      void this.store.refresh();
    }
  }

  toggle(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next && this.isAuthenticated) {
      void this.store.refresh();
    }
  }

  onConnect(): void {
    void this.store.connect();
  }

  onUnlink(): void {
    void this.store.unlink();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }
}
