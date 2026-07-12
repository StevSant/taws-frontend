import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  output,
} from '@angular/core';
import { TranslationService } from '../../../../core';
import { PlanUsageWidgetComponent, UserProfileChipComponent } from '../../../../shared';
import { AuthStore } from '../../../auth/application';
import { ChatSessionsStore } from '../../application/chat-sessions-store';
import { truncateSessionTitle } from '../../application/truncate-session-title';

const SESSIONS_MOBILE_BREAKPOINT = '(max-width: 900px)';

/** Matches the "78%" embedded in the `chat.plan.usage` copy string (both locales). */
const PLAN_USAGE_PERCENT = 78;
const GUEST_INITIAL = 'T';

@Component({
  selector: 'app-chat-sessions-panel',
  standalone: true,
  imports: [PlanUsageWidgetComponent, UserProfileChipComponent],
  templateUrl: './chat-sessions-panel.component.html',
  styleUrl: './chat-sessions-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatSessionsPanelComponent implements OnDestroy {
  readonly sessionsStore = inject(ChatSessionsStore);
  readonly i18n = inject(TranslationService);
  readonly auth = inject(AuthStore);

  readonly mobileOpen = input(false);
  readonly closePanel = output<void>();

  readonly planUsagePercent = PLAN_USAGE_PERCENT;

  readonly userEmail = computed(() => this.auth.user()?.email ?? '');

  readonly userInitial = computed(() => {
    const email = this.auth.user()?.email;
    return email ? email.charAt(0).toUpperCase() : GUEST_INITIAL;
  });

  private mobileMediaQuery =
    typeof window !== 'undefined' ? window.matchMedia(SESSIONS_MOBILE_BREAKPOINT) : null;
  private readonly onMobileViewportChange = (event: MediaQueryListEvent): void => {
    this.isMobileViewport = event.matches;
  };

  private isMobileViewport = this.mobileMediaQuery?.matches ?? false;

  constructor() {
    this.mobileMediaQuery?.addEventListener('change', this.onMobileViewportChange);
  }

  ngOnDestroy(): void {
    this.mobileMediaQuery?.removeEventListener('change', this.onMobileViewportChange);
  }

  sessionTitle(title: string): string {
    if (this.sessionsStore.isDefaultTitle(title)) {
      return this.i18n.t('chat.sessions.new');
    }
    return truncateSessionTitle(title);
  }

  onClose(): void {
    this.closePanel.emit();
  }

  onSelect(sessionId: string): void {
    this.sessionsStore.selectSession(sessionId);
    if (this.isMobileViewport) {
      this.closePanel.emit();
    }
  }

  onCreate(): void {
    this.sessionsStore.createSession();
  }

  onDelete(event: MouseEvent, sessionId: string): void {
    event.stopPropagation();
    this.sessionsStore.deleteSession(sessionId);
  }
}
