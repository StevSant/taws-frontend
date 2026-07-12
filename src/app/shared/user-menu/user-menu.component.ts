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
import { Router } from '@angular/router';
import { TranslationService } from '../../core';
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
  private readonly router = inject(Router);

  readonly initial = input.required<string>();
  readonly email = input('');
  readonly displayName = input.required<string>();

  readonly logout = output<void>();

  readonly isOpen = signal(false);

  readonly triggerLabel = computed(() => this.displayName() || this.email() || this.initial());

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  onLogout(): void {
    this.isOpen.set(false);
    this.logout.emit();
  }

  onOpenProfile(): void {
    this.isOpen.set(false);
    void this.router.navigate(['/user']);
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
}
