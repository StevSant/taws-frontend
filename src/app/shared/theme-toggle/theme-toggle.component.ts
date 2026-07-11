import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { Theme, ThemeService, TranslationService } from '../../core';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  readonly i18n = inject(TranslationService);
  readonly themes = inject(ThemeService);
  readonly isOpen = signal(false);

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  selectTheme(theme: Theme): void {
    this.themes.setTheme(theme);
    this.isOpen.set(false);
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
