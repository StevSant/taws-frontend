import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, SpinnerComponent } from '../../../../shared';
import { ChatStore } from '../../application';
import { ChatRepository } from '../../domain';
import { SseChatRepository } from '../../infrastructure';

/**
 * Chat page: input box + send button + streaming message list.
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

  constructor(readonly store: ChatStore) {}

  onSend(): void {
    const message = this.draft();
    this.draft.set('');
    void this.store.send(message);
  }
}
