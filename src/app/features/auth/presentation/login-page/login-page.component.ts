import { Component, computed, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import { ButtonComponent, SpinnerComponent } from '../../../../shared';
import { AuthErrorCode, AuthStore } from '../../application';

type AuthMode = 'login' | 'signup';

const SUBMIT_LABELS: Record<AuthMode, TranslationKey> = {
  login: 'auth.submit.login',
  signup: 'auth.submit.signup',
};

const TITLE_LABELS: Record<AuthMode, TranslationKey> = {
  login: 'auth.login.title',
  signup: 'auth.signup.title',
};

const TOGGLE_LABELS: Record<AuthMode, TranslationKey> = {
  login: 'auth.toggle.toSignup',
  signup: 'auth.toggle.toLogin',
};

/**
 * Maps every `AuthErrorCode` to a translation key. `store.error()` is never
 * raw text (see `AuthStore.toErrorCode`), so this lookup is exhaustive and
 * the template never renders unmapped/untranslated content.
 */
const ERROR_LABELS: Record<AuthErrorCode, TranslationKey> = {
  configMissing: 'auth.error.configMissing',
  noSession: 'auth.error.noSession',
  unknown: 'auth.error.unknown',
};

const DEFAULT_REDIRECT_PATH = '/radar';

/**
 * Combined login/signup form (email+password) for Supabase Auth. Redirects
 * to `?returnUrl=` (set by `authGuard`) — or `/radar` — as soon as
 * AuthStore reports an authenticated session, which covers both a fresh
 * login/signup and the case where an already-logged-in user lands here
 * directly.
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, ButtonComponent, SpinnerComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  readonly mode = signal<AuthMode>('login');
  readonly email = signal('');
  readonly password = signal('');

  readonly isSubmitting = computed(() => this.store.status() === 'submitting');
  readonly confirmationRequired = computed(() => this.store.status() === 'confirmationRequired');
  readonly canSubmit = computed(
    () => !this.isSubmitting() && this.email().trim().length > 0 && this.password().length > 0,
  );

  constructor(
    readonly store: AuthStore,
    readonly i18n: TranslationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    effect(() => {
      if (this.store.isAuthenticated()) {
        void this.router.navigateByUrl(this.resolveReturnUrl());
      }
    });
  }

  titleLabel(): string {
    return this.i18n.t(TITLE_LABELS[this.mode()]);
  }

  submitLabel(): string {
    return this.i18n.t(SUBMIT_LABELS[this.mode()]);
  }

  toggleLabel(): string {
    return this.i18n.t(TOGGLE_LABELS[this.mode()]);
  }

  /** Translated message for the current auth error code, or `null` when there is none. */
  errorMessage(): string | null {
    const code = this.store.error();
    return code ? this.i18n.t(ERROR_LABELS[code]) : null;
  }

  toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'signup' : 'login');
  }

  onSubmit(): void {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password || this.isSubmitting()) {
      return;
    }

    if (this.mode() === 'login') {
      void this.store.login(email, password);
    } else {
      void this.store.signUp(email, password);
    }
  }

  private resolveReturnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') ?? DEFAULT_REDIRECT_PATH;
  }
}
