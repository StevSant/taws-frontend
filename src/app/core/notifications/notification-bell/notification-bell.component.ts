import { DatePipe } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  signal,
} from '@angular/core';
import { LucideBell, LucideX } from '@lucide/angular';
import { TranslationService } from '../../i18n';
import { Notification, NotificationLink } from '../notification.model';
import { resolveNotificationLink } from '../resolve-notification-link';

/**
 * Presentational bell icon + dropdown for in-app notifications, mounted in
 * `ShellComponent`'s header (same slot pattern as the language toggle /
 * auth button). Takes `notifications` via `@Input` and emits `dismiss`/
 * `clearAll` — it never touches `NotificationsStore` directly, mirroring
 * this codebase's container/presentational split (e.g.
 * `RadarFiltersComponent`, `BriefingCardComponent`).
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [DatePipe, LucideBell, LucideX],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  @Input() notifications: Notification[] = [];
  @Output() dismiss = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() openNotification = new EventEmitter<Notification>();

  readonly isOpen = signal(false);

  constructor(
    readonly i18n: TranslationService,
    private readonly host: ElementRef<HTMLElement>,
  ) {}

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  onDismiss(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.dismiss.emit(id);
  }

  onOpen(notification: Notification): void {
    if (!this.linkFor(notification)) {
      return;
    }
    this.openNotification.emit(notification);
    this.isOpen.set(false);
  }

  linkFor(notification: Notification): NotificationLink | undefined {
    return (
      notification.link ?? resolveNotificationLink(notification.messageKey, notification.detail)
    );
  }

  onClearAll(): void {
    this.clearAll.emit();
  }

  /** Closes the dropdown on an outside click, so it doesn't stay stuck open. */
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
