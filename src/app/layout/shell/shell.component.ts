import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Locale, TranslationService } from '../../core';

/**
 * Application-wide layout: header (brand + section nav + language toggle) +
 * routed content. Routed as the root component in app.routes.ts so every
 * page renders inside it.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  constructor(readonly i18n: TranslationService) {}

  setLocale(locale: Locale): void {
    this.i18n.setLocale(locale);
  }
}
