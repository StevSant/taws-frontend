import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core';
import { ButtonComponent, GoldenPolyhedronComponent } from '../../../../shared';
import { ChatStore } from '../../application';
import { ChatRepository } from '../../domain';
import { SseChatRepository } from '../../infrastructure';
import { RoutingTraceComponent } from '../routing-trace/routing-trace.component';

/** Hero centerpiece sizes — large while idle (Oracle-style), compact once a turn has started. */
const HERO_SIZE_IDLE = 168;
const HERO_SIZE_ACTIVE = 64;

/**
 * Chat page: input box + send button + streaming message list, with the
 * Supervisor's agent-routing trace ("Supervisor -> Quant", via
 * RoutingTraceComponent) rendered above the pending assistant message and a
 * banner for stream-level errors. ChatStore/ChatRepository are provided here
 * so each navigation to this page gets a fresh conversation (feature-scoped
 * DI).
 */
@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [FormsModule, ButtonComponent, GoldenPolyhedronComponent, RoutingTraceComponent],
  providers: [ChatStore, { provide: ChatRepository, useClass: SseChatRepository }],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPageComponent {
  readonly store = inject(ChatStore);
  readonly i18n = inject(TranslationService);

  readonly draft = signal('');

  /** Drives the hero layout (idle centerpiece vs. compact once a turn starts) — styling only. */
  readonly hasMessages = computed(() => this.store.messages().length > 0);
  readonly heroSize = computed(() => (this.hasMessages() ? HERO_SIZE_ACTIVE : HERO_SIZE_IDLE));

  onSend(): void {
    const message = this.draft();
    this.draft.set('');
    void this.store.send(message);
  }
}
