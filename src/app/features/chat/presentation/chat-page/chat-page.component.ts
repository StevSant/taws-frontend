import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import { AuthStore } from '../../../auth/application';
import { ButtonComponent, GoldenPolyhedronComponent } from '../../../../shared';
import { PolyhedronActivity } from '../../../../shared/golden-polyhedron/polyhedron-activity.model';
import { ChatStore } from '../../application';
import { ChatRepository } from '../../domain';
import { SseChatRepository } from '../../infrastructure';
import { CHAT_VOICE_DUMMY_LISTEN_MS } from './chat-voice-dummy';

const HERO_SIZE_IDLE = 168;
const AVATAR_SIZE = 48;

const AGENT_LABEL_KEYS: Record<string, TranslationKey> = {
  supervisor: 'chat.agent.supervisor',
  analyst: 'chat.agent.analyst',
  quant: 'chat.agent.quant',
  advisor: 'chat.agent.advisor',
  consequence: 'chat.agent.consequence',
};

const SUGGESTION_KEYS = [
  'chat.suggestion.quant',
  'chat.suggestion.news',
  'chat.suggestion.macro',
] as const satisfies readonly TranslationKey[];

const ORACLE_STATUS_KEYS: Record<PolyhedronActivity, TranslationKey> = {
  idle: 'chat.oracle.status.idle',
  listening: 'chat.oracle.status.listening',
  composing: 'chat.oracle.status.composing',
  streaming: 'chat.oracle.status.streaming',
};

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonComponent,
    GoldenPolyhedronComponent,
  ],
  providers: [ChatStore, { provide: ChatRepository, useClass: SseChatRepository }],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPageComponent implements OnInit, OnDestroy {
  readonly store = inject(ChatStore);
  readonly i18n = inject(TranslationService);
  readonly auth = inject(AuthStore);

  readonly draft = signal('');
  readonly isListening = signal(false);
  readonly suggestionKeys = SUGGESTION_KEYS;

  readonly hasMessages = computed(() => this.store.messages().length > 0);
  readonly heroSize = computed(() => HERO_SIZE_IDLE);
  readonly avatarSize = AVATAR_SIZE;
  readonly canCompose = computed(() => this.auth.isAuthenticated() && !this.store.isStreaming());

  readonly oracleActivity = computed<PolyhedronActivity>(() => {
    if (this.isListening()) {
      return 'listening';
    }
    if (this.store.isStreaming()) {
      return 'streaming';
    }
    if (this.draft().trim().length > 0) {
      return 'composing';
    }
    return 'idle';
  });

  readonly oracleStatusLabel = computed(() => this.i18n.t(ORACLE_STATUS_KEYS[this.oracleActivity()]));

  readonly respondingAgentLabel = computed(() => {
    const hops = this.store.routingHops();
    const hop = [...hops].reverse().find((h) => h.status === 'active' || h.status === 'done');
    return hop ? this.agentLabel(hop.agent) : this.i18n.t('chat.role.assistant');
  });

  readonly userInitial = computed(() => {
    const email = this.auth.user()?.email;
    if (!email) {
      return 'T';
    }
    return email.charAt(0).toUpperCase();
  });

  private voiceDummyTimer: ReturnType<typeof setTimeout> | null = null;

  agentLabel(agent: string): string {
    const key = AGENT_LABEL_KEYS[agent];
    return key ? this.i18n.t(key) : agent;
  }

  isLatestAssistant(messageId: string): boolean {
    const assistants = this.store.messages().filter((m) => m.role === 'assistant');
    return assistants[assistants.length - 1]?.id === messageId;
  }

  ngOnInit(): void {
    document.documentElement.classList.add('route-chat');
    document.body.classList.add('route-chat');
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('route-chat');
    document.body.classList.remove('route-chat');
    this.clearVoiceDummyTimer();
  }

  onSend(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    this.stopListening();
    const message = this.draft();
    this.draft.set('');
    void this.store.send(message);
  }

  useSuggestion(key: TranslationKey): void {
    if (!this.auth.isAuthenticated() || this.store.isStreaming()) {
      return;
    }

    this.draft.set(this.i18n.t(key));
  }

  toggleVoiceDummy(): void {
    if (!this.canCompose()) {
      return;
    }

    if (this.isListening()) {
      this.stopListening();
      return;
    }

    this.isListening.set(true);
    this.clearVoiceDummyTimer();
    this.voiceDummyTimer = setTimeout(() => {
      this.draft.set(this.i18n.t('chat.voice.dummyTranscript'));
      this.isListening.set(false);
      this.voiceDummyTimer = null;
    }, CHAT_VOICE_DUMMY_LISTEN_MS);
  }

  private stopListening(): void {
    this.isListening.set(false);
    this.clearVoiceDummyTimer();
  }

  private clearVoiceDummyTimer(): void {
    if (this.voiceDummyTimer !== null) {
      clearTimeout(this.voiceDummyTimer);
      this.voiceDummyTimer = null;
    }
  }
}
