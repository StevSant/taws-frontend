import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Theme, ThemeService, TranslationService } from '../../core';
import { DropdownAnchor, syncDropdownAnchor } from '../sync-dropdown-anchor';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.pref-control-host--open]': 'isOpen()',
  },
})
export class ThemeToggleComponent {
  readonly i18n = inject(TranslationService);
  readonly themes = inject(ThemeService);
  readonly isOpen = signal(false);
  readonly menuAnchor = signal<DropdownAnchor>({ top: 0, left: 0 });

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle(): void {
    const opening = !this.isOpen();
    if (opening) {
      this.syncMenuAnchor();
    }
    this.isOpen.set(opening);
  }

  selectTheme(theme: Theme): void {
    this.themes.setTheme(theme);
    this.isOpen.set(false);
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
