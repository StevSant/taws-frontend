import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationKey, TranslationService } from '../../../../core';
import { ButtonComponent, SpinnerComponent } from '../../../../shared';
import { ChatStore } from '../../application';
import { AgentTraceEvent, ChatRepository } from '../../domain';
import { SseChatRepository } from '../../infrastructure';

const TRACE_EVENT_LABELS: Record<AgentTraceEvent, TranslationKey> = {
  routing: 'chat.trace.routing',
  start: 'chat.trace.start',
  done: 'chat.trace.done',
};

/**
 * Chat page: input box + send button + streaming message list, with the
 * Supervisor's agent-routing trace ("Supervisor -> Quant") rendered above
 * the pending assistant message and a banner for stream-level errors.
 * ChatStore/ChatRepository are provided here so each navigation to this page
 * gets a fresh conversation (feature-scoped DI).
 */
@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [FormsModule, ButtonComponent, SpinnerComponent],
  providers: [ChatStore, { provide: ChatRepository, useClass: SseChatRepository }],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
})
export class ChatPageComponent {
  readonly draft = signal('');

  constructor(
    readonly store: ChatStore,
    readonly i18n: TranslationService,
  ) {}

  onSend(): void {
    const message = this.draft();
    this.draft.set('');
    void this.store.send(message);
  }

  traceEventLabel(event: AgentTraceEvent): string {
    return this.i18n.t(TRACE_EVENT_LABELS[event]);
  }
}
