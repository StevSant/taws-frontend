import { ChangeDetectionStrategy, Component, inject, input, OnDestroy, output } from '@angular/core';
import { TranslationService } from '../../../../core';
import { ChatSessionsStore } from '../../application/chat-sessions-store';

const SESSIONS_MOBILE_BREAKPOINT = '(max-width: 900px)';

@Component({
  selector: 'app-chat-sessions-panel',
  standalone: true,
  templateUrl: './chat-sessions-panel.component.html',
  styleUrl: './chat-sessions-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatSessionsPanelComponent implements OnDestroy {
  readonly sessionsStore = inject(ChatSessionsStore);
  readonly i18n = inject(TranslationService);

  readonly mobileOpen = input(false);
  readonly closePanel = output<void>();

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
    return this.sessionsStore.isDefaultTitle(title)
      ? this.i18n.t('chat.sessions.new')
      : title;
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
