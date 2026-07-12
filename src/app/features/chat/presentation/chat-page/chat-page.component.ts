import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { RouterLink } from '@angular/router';

import { TranslationKey, TranslationService } from '../../../../core';

import { AuthStore } from '../../../auth/application';

import { ButtonComponent, GoldenPolyhedronComponent } from '../../../../shared';

import { PolyhedronActivity } from '../../../../shared/golden-polyhedron/polyhedron-activity.model';

import { ChatSessionsStore, ChatStore } from '../../application';

import { ChatRepository } from '../../domain';

import { SseChatRepository } from '../../infrastructure';

import { ChartComponent } from '../../../../shared/charts';

import { ChatSessionsPanelComponent } from '../chat-sessions-panel/chat-sessions-panel.component';

import { ChatContextRailComponent } from '../chat-context-rail/chat-context-rail.component';

import { ChatQuickActionsComponent } from '../chat-quick-actions/chat-quick-actions.component';

import { CHAT_VOICE_DUMMY_LISTEN_MS } from './chat-voice-dummy';

const HERO_SIZE_IDLE = 136;
const AVATAR_SIZE = 48;

const AGENT_LABEL_KEYS: Record<string, TranslationKey> = {
  supervisor: 'chat.agent.supervisor',

  analyst: 'chat.agent.analyst',

  quant: 'chat.agent.quant',

  advisor: 'chat.agent.advisor',

  consequence: 'chat.agent.consequence',
};

const SESSIONS_PANEL_STORAGE_KEY = 'taws-chat-sessions-open';

type OracleActivity = Exclude<PolyhedronActivity, 'frozen'>;

const ORACLE_STATUS_KEYS: Record<OracleActivity, TranslationKey> = {
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

    ChatSessionsPanelComponent,

    ChatContextRailComponent,

    ChatQuickActionsComponent,

    ChartComponent,
  ],

  providers: [
    ChatSessionsStore,

    ChatStore,

    { provide: ChatRepository, useClass: SseChatRepository },
  ],

  templateUrl: './chat-page.component.html',

  styleUrl: './chat-page.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPageComponent implements OnInit, OnDestroy {
  readonly store = inject(ChatStore);

  readonly sessionsStore = inject(ChatSessionsStore);

  readonly i18n = inject(TranslationService);

  readonly auth = inject(AuthStore);

  readonly draft = signal('');

  readonly isListening = signal(false);

  readonly sessionsOpen = signal(this.readSessionsPanelOpen());

  readonly hasMessages = computed(() => this.store.messages().length > 0);

  readonly heroSize = computed(() => HERO_SIZE_IDLE);
  readonly avatarSize = AVATAR_SIZE;

  readonly canCompose = computed(() => this.auth.isAuthenticated() && !this.store.isStreaming());

  readonly oracleActivity = computed<OracleActivity>(() => {
    if (this.isListening()) {
      return 'listening';
    }

    if (this.store.isStreaming()) {
      return 'streaming';
    }

    return 'idle';
  });

  readonly oracleStatusLabel = computed(() =>
    this.i18n.t(ORACLE_STATUS_KEYS[this.oracleActivity()]),
  );

  readonly respondingAgentLabel = computed(() => {
    const hops = this.store.routingHops();

    const hop = [...hops].reverse().find((h) => h.status === 'active' || h.status === 'done');

    return hop ? this.agentLabel(hop.agent) : this.i18n.t('chat.role.assistant');
  });

  private readonly composerInput = viewChild<ElementRef<HTMLInputElement>>('composerInput');
  private voiceDummyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id;

      if (userId) {
        this.sessionsStore.bootstrap(userId);

        return;
      }

      this.sessionsStore.clear();
    });
  }

  agentLabel(agent: string): string {
    const key = AGENT_LABEL_KEYS[agent];

    return key ? this.i18n.t(key) : agent;
  }

  isLatestAssistant(messageId: string): boolean {
    const assistants = this.store.messages().filter((m) => m.role === 'assistant');

    return assistants[assistants.length - 1]?.id === messageId;
  }

  avatarActivity(messageId: string, pending: boolean): PolyhedronActivity {
    if (pending && this.isLatestAssistant(messageId)) {
      return this.oracleActivity();
    }

    return 'frozen';
  }

  openSessionsPanel(): void {
    this.setSessionsPanelOpen(true);
  }

  closeSessionsPanel(): void {
    this.setSessionsPanelOpen(false);
  }

  focusComposer(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    this.composerInput()?.nativeElement.focus();
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

  onQuickAction(suggestionKey: string): void {
    this.useSuggestion(suggestionKey as TranslationKey);
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

  private readSessionsPanelOpen(): boolean {
    if (typeof localStorage === 'undefined') {
      return true;
    }

    return localStorage.getItem(SESSIONS_PANEL_STORAGE_KEY) !== 'false';
  }

  private setSessionsPanelOpen(open: boolean): void {
    this.sessionsOpen.set(open);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SESSIONS_PANEL_STORAGE_KEY, String(open));
    }
  }
}
