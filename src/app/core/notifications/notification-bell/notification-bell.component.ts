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
import { TranslationService } from '../../i18n';
import { Notification } from '../notification.model';

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
  imports: [DatePipe],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  @Input() notifications: Notification[] = [];
  @Output() dismiss = new EventEmitter<string>();
  @Output() clearAll = new EventEmitter<void>();

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
