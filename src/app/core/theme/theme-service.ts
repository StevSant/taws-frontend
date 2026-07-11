import { Injectable, signal } from '@angular/core';
import { THEME_STORAGE_KEY } from './theme-storage-key';
import { Theme } from './theme.model';

const DEFAULT_THEME: Theme = 'dark';

/**
 * Applies the active theme to `<html data-theme="…">` and persists the choice
 * in localStorage. An inline script in index.html reads the same key before
 * first paint to avoid a flash of the wrong theme.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSignal = signal<Theme>(this.readStoredTheme());

  readonly theme = this.themeSignal.asReadonly();

  setTheme(theme: Theme): void {
    this.themeSignal.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  private readStoredTheme(): Theme {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return DEFAULT_THEME;
  }
}
