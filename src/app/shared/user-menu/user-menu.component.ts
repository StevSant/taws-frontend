import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslationService } from '../../core';
import { DropdownAnchor, syncDropdownAnchor } from '../sync-dropdown-anchor';
import { UserProfileChipComponent } from '../user-profile-chip/user-profile-chip.component';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [UserProfileChipComponent],
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.user-menu-host--open]': 'isOpen()',
  },
})
export class UserMenuComponent {
  readonly i18n = inject(TranslationService);

  readonly initial = input.required<string>();
  readonly email = input('');
  readonly displayName = input.required<string>();

  readonly logout = output<void>();

  readonly isOpen = signal(false);
  readonly menuAnchor = signal<DropdownAnchor>({ top: 0, left: 0 });

  readonly triggerLabel = computed(() => this.displayName() || this.email() || this.initial());

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle(): void {
    const opening = !this.isOpen();
    if (opening) {
      this.syncMenuAnchor();
    }
    this.isOpen.set(opening);
  }

  onLogout(): void {
    this.isOpen.set(false);
    this.logout.emit();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
    if (this.isOpen()) {
      this.syncMenuAnchor();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }
    const target = event.target as Node;
    if (!this.host.nativeElement.contains(target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }

  private syncMenuAnchor(): void {
    this.menuAnchor.set(syncDropdownAnchor(this.host.nativeElement));
  }
}
