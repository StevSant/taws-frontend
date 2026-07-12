import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../../../auth/application';
import { ThemeService, TranslationService } from '../../../../core';
import { BotRegistrationPanelComponent } from '../../../../core/telegram';
import {
  ButtonComponent,
  FeaturePageHeaderComponent,
  LanguageToggleComponent,
  ThemeToggleComponent,
  UserProfileChipComponent,
} from '../../../../shared';

@Component({
  selector: 'app-user-page',
  standalone: true,
  imports: [
    FeaturePageHeaderComponent,
    UserProfileChipComponent,
    ThemeToggleComponent,
    LanguageToggleComponent,
    ButtonComponent,
    BotRegistrationPanelComponent,
  ],
  templateUrl: './user-page.component.html',
  styleUrl: './user-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPageComponent {
  readonly i18n = inject(TranslationService);
  readonly themes = inject(ThemeService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  readonly displayName = computed(() => this.i18n.t('chat.profile.guest'));

  readonly userInitial = computed(() => {
    const email = this.user()?.email;
    return email ? email.charAt(0).toUpperCase() : '?';
  });

  readonly userEmail = computed(() => this.user()?.email ?? '');

  readonly themeLabel = computed(() =>
    this.themes.theme() === 'dark'
      ? this.i18n.t('shell.theme.dark')
      : this.i18n.t('shell.theme.light'),
  );

  readonly languageLabel = computed(() =>
    this.i18n.locale() === 'es'
      ? this.i18n.t('shell.language.esFull')
      : this.i18n.t('shell.language.enFull'),
  );

  logout(): void {
    void this.auth.logout().then(() => this.router.navigateByUrl('/login'));
  }
}
