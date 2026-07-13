import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  output,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslationService } from '../../../../core';
import { ChatSessionsStore } from '../../application/chat-sessions-store';
import { ChatSession } from '../../domain';
import { MarqueeOnHoverDirective } from './marquee-on-hover.directive';

const SESSIONS_MOBILE_BREAKPOINT = '(max-width: 900px)';

@Component({
  selector: 'app-chat-sessions-panel',
  standalone: true,
  imports: [MarqueeOnHoverDirective],
  templateUrl: './chat-sessions-panel.component.html',
  styleUrl: './chat-sessions-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'chat-sessions-host',
    '[class.chat-sessions-host--open]': 'mobileOpen()',
  },
})
export class ChatSessionsPanelComponent implements OnDestroy {
  readonly sessionsStore = inject(ChatSessionsStore);
  readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);

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
    if (this.sessionsStore.isDefaultTitle(title)) {
      return this.i18n.t('chat.sessions.new');
    }
    return title;
  }

  /**
   * The list the server returns carries no transcripts — a thread's turns are fetched when
   * it is opened — so the meta line shows when the thread was last active instead of a
   * message count that would read "0" for every thread the user hasn't opened yet.
   */
  sessionMeta(session: ChatSession): string {
    const updatedAt = new Date(session.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat(this.i18n.locale(), {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(updatedAt);
  }

  onClose(): void {
    this.closePanel.emit();
  }

  onSelect(sessionId: string): void {
    void this.router.navigate(['/chat', sessionId]);
    if (this.isMobileViewport) {
      this.closePanel.emit();
    }
  }

  onCreate(): void {
    const sessionId = this.sessionsStore.createSession();
    void this.router.navigate(['/chat', sessionId]);
    if (this.isMobileViewport) {
      this.closePanel.emit();
    }
  }

  onDelete(event: MouseEvent, sessionId: string): void {
    event.stopPropagation();
    this.sessionsStore.deleteSession(sessionId);
    const activeId = this.sessionsStore.activeSessionId();
    if (activeId) {
      void this.router.navigate(['/chat', activeId]);
    }
  }
}
