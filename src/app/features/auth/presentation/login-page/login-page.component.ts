import { Location } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppConfigService, TranslationKey, TranslationService } from '../../../../core';
import {
  ButtonComponent,
  LanguageToggleComponent,
  MidasGlyphComponent,
  MidasLogoComponent,
  SpinnerComponent,
  ThemeToggleComponent,
  midasAgentGlyph,
} from '../../../../shared';
import { AGENT_CATALOG, AgentProfile } from '../../../agents/domain/agent-catalog';
import { AuthErrorCode, AuthStore } from '../../application';
import { DemoAuthPerspective } from '../../domain/models/demo-auth-perspective.model';

type AuthMode = 'login' | 'signup';

const SUBMIT_LABELS: Record<AuthMode, TranslationKey> = {
  login: 'auth.submit.login',
  signup: 'auth.submit.signup',
};

const TITLE_LABELS: Record<AuthMode, TranslationKey> = {
  login: 'auth.login.welcome',
  signup: 'auth.signup.title',
};

const TOGGLE_LABELS: Record<AuthMode, TranslationKey> = {
  login: 'auth.toggle.toSignup',
  signup: 'auth.toggle.toLogin',
};

const ERROR_LABELS: Record<AuthErrorCode, TranslationKey> = {
  configMissing: 'auth.error.configMissing',
  noSession: 'auth.error.noSession',
  unknown: 'auth.error.unknown',
};

const DEFAULT_REDIRECT_PATH = '/radar';

/** Data providers shown in the login “Fuentes” strip (honest labels, not partner claims). */
const DATA_SOURCES: readonly { id: string; label: string }[] = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'cnn', label: 'CNN Fear & Greed' },
  { id: 'yfinance', label: 'Yahoo Finance' },
  { id: 'fred', label: 'FRED' },
  { id: 'marketaux', label: 'Marketaux' },
  { id: 'newsapi', label: 'NewsAPI' },
  { id: 'finnhub', label: 'Finnhub' },
  { id: 'supabase', label: 'Supabase' },
];

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    LanguageToggleComponent,
    MidasGlyphComponent,
    MidasLogoComponent,
    SpinnerComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent implements OnInit, OnDestroy {
  readonly mode = signal<AuthMode>('login');
  readonly email = signal('');
  readonly password = signal('');
  readonly activePerspectiveId = signal<DemoAuthPerspective['id'] | null>(null);
  readonly showcaseMidasSize = signal(112);
  readonly showcaseAgentSize = signal(42);

  readonly store = inject(AuthStore);
  readonly i18n = inject(TranslationService);
  private readonly config = inject(AppConfigService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);

  readonly demoPerspectives = this.config.demoAuthPerspectives;
  readonly showDemoPerspectives = computed(
    () => this.demoPerspectives.length > 0 && this.mode() === 'login',
  );

  readonly isSubmitting = computed(() => this.store.status() === 'submitting');
  readonly confirmationRequired = computed(() => this.store.status() === 'confirmationRequired');
  readonly canSubmit = computed(
    () => !this.isSubmitting() && this.email().trim().length > 0 && this.password().length > 0,
  );

  readonly supervisor = AGENT_CATALOG.find((agent) => agent.id === 'supervisor')!;
  readonly specialists = AGENT_CATALOG.filter((agent) => agent.kind === 'specialist');
  readonly dataSources = DATA_SOURCES;

  constructor() {
    effect(() => {
      if (this.store.isAuthenticated()) {
        void this.router.navigateByUrl(this.resolveReturnUrl());
      }
    });
  }

  ngOnInit(): void {
    document.body.classList.add('route-login');
    this.updateShowcaseSizes();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('route-login');
  }

  @HostListener('window:resize')
  onViewportResize(): void {
    this.updateShowcaseSizes();
  }

  glyphFor(agent: AgentProfile) {
    return midasAgentGlyph(agent.id);
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

  errorMessage(): string | null {
    const code = this.store.error();
    return code ? this.i18n.t(ERROR_LABELS[code]) : null;
  }

  isPerspectiveBusy(id: DemoAuthPerspective['id']): boolean {
    return this.isSubmitting() && this.activePerspectiveId() === id;
  }

  toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'signup' : 'login');
    this.activePerspectiveId.set(null);
  }

  goBack(): void {
    const returnUrl = this.safeInternalPath(this.route.snapshot.queryParamMap.get('returnUrl'));

    if (returnUrl) {
      void this.router.navigateByUrl(DEFAULT_REDIRECT_PATH);
      return;
    }

    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl(DEFAULT_REDIRECT_PATH);
  }

  onSubmit(): void {
    const email = this.email().trim();
    const password = this.password();
    if (!email || !password || this.isSubmitting()) {
      return;
    }

    this.activePerspectiveId.set(null);
    if (this.mode() === 'login') {
      void this.store.login(email, password);
    } else {
      void this.store.signUp(email, password);
    }
  }

  loginAsPerspective(perspective: DemoAuthPerspective): void {
    if (this.isSubmitting()) {
      return;
    }

    this.email.set(perspective.email);
    this.password.set(perspective.password);
    this.activePerspectiveId.set(perspective.id);
    void this.store.login(perspective.email, perspective.password).finally(() => {
      if (this.activePerspectiveId() === perspective.id) {
        this.activePerspectiveId.set(null);
      }
    });
  }

  demoPersonaParts(personaKey: TranslationKey): { name: string; focus: string } {
    const text = this.i18n.t(personaKey);
    const segments = text.split('·').map((segment) => segment.trim());
    return {
      name: segments[0] ?? text,
      focus: segments[1] ?? '',
    };
  }

  private resolveReturnUrl(): string {
    return (
      this.safeInternalPath(this.route.snapshot.queryParamMap.get('returnUrl')) ??
      DEFAULT_REDIRECT_PATH
    );
  }

  private updateShowcaseSizes(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (width >= 1920 && height >= 1000) {
      this.showcaseMidasSize.set(162);
      this.showcaseAgentSize.set(58);
      return;
    }

    if (width >= 1440 && height >= 800) {
      this.showcaseMidasSize.set(134);
      this.showcaseAgentSize.set(50);
      return;
    }

    if (width >= 981 && height <= 720) {
      this.showcaseMidasSize.set(90);
      this.showcaseAgentSize.set(34);
      return;
    }

    this.showcaseMidasSize.set(112);
    this.showcaseAgentSize.set(42);
  }

  private safeInternalPath(url: string | null): string | null {
    if (!url || !url.startsWith('/') || url.startsWith('//')) {
      return null;
    }
    return url;
  }
}
