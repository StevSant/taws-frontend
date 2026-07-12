import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService, TranslationService } from '../../core';

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

  toggleTheme(): void {
    const next = this.themes.theme() === 'dark' ? 'light' : 'dark';
    this.themes.setTheme(next);
  }
}
