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

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslationKey, TranslationService } from '../../../../core';

import { AuthStore } from '../../../auth/application';

import { GoldenPolyhedronComponent, MarkdownPipe, MidasGlyphComponent } from '../../../../shared';

import { MidasGlyphId } from '../../../../shared/midas-glyph/midas-glyph.model';

import { PolyhedronActivity } from '../../../../shared/golden-polyhedron/polyhedron-activity.model';

import { ChatSessionsStore, ChatStore } from '../../application';

import { ShellSearchService } from '../../../../layout/shell/shell-search.service';

import {
  ChatMessage,
  ChatNewsQuestion,
  ChatRepository,
  RoutingHop,
  ToolHopSnapshot,
  formatToolName,
  resolveAgentGlyph,
  resolveRespondingAgent,
  specialistRoutingHops,
} from '../../domain';

import { SseChatRepository } from '../../infrastructure';

import {
  AudioPlaybackStore,
  DictationStore,
  prefersReducedMotion,
  SpeechToTextProvider,
  TextToSpeechProvider,
} from '../../../audio';

import {
  HttpSttProvider,
  HttpTtsProvider,
  HybridSpeechToTextProvider,
  HybridTextToSpeechProvider,
  WebSpeechSttProvider,
  WebSpeechTtsProvider,
} from '../../../audio/infrastructure';

import { RealtimeTurn, TalkButtonComponent } from '../../../realtime';

import { ChartComponent } from '../../../../shared/charts';

import { ChatSessionsPanelComponent } from '../chat-sessions-panel/chat-sessions-panel.component';

import { ChatContextRailComponent } from '../chat-context-rail/chat-context-rail.component';
import { ChatReferenceChipComponent } from '../chat-reference-chip/chat-reference-chip.component';

import { ChatQuickActionsComponent } from '../chat-quick-actions/chat-quick-actions.component';

const HERO_SIZE_IDLE = 136;
const AVATAR_SIZE = 48;

const AGENT_LABEL_KEYS: Record<string, TranslationKey> = {
  supervisor: 'chat.agent.supervisor',
  analyst: 'chat.agent.analyst',
  quant: 'chat.agent.quant',
  advisor: 'chat.agent.advisor',
  consequence: 'chat.agent.consequence',
  macro: 'chat.agent.macro',
  sentiment: 'chat.agent.sentiment',
};

const SESSIONS_PANEL_STORAGE_KEY = 'taws-chat-sessions-open';
const CONTEXT_RAIL_STORAGE_KEY = 'taws-chat-rail-open';
const SESSIONS_MOBILE_BREAKPOINT = '(max-width: 900px)';

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

    GoldenPolyhedronComponent,

    MidasGlyphComponent,

    MarkdownPipe,

    ChatSessionsPanelComponent,

    ChatContextRailComponent,
    ChatReferenceChipComponent,

    ChatQuickActionsComponent,

    ChartComponent,

    TalkButtonComponent,
  ],

  providers: [
    ChatSessionsStore,

    ChatStore,

    { provide: ChatRepository, useClass: SseChatRepository },

    // Hybrid TTS: HTTP server voice with a transparent Web Speech fallback.
    // The store depends only on the TextToSpeechProvider port; the composite
    // decides HTTP-first vs Web-Speech-only based on `ttsEnabled`.
    HttpTtsProvider,
    WebSpeechTtsProvider,
    { provide: TextToSpeechProvider, useClass: HybridTextToSpeechProvider },
    AudioPlaybackStore,

    // Hybrid STT: server voice dictation with a Web Speech fallback. The store
    // depends only on the SpeechToTextProvider port; the composite decides
    // HTTP-first vs Web-Speech-only based on `sttEnabled`.
    HttpSttProvider,
    WebSpeechSttProvider,
    { provide: SpeechToTextProvider, useClass: HybridSpeechToTextProvider },
    DictationStore,
  ],

  templateUrl: './chat-page.component.html',

  styleUrls: [
    './chat-page.component.scss',
    './chat-page.hero.scss',
    './chat-page.messages.scss',
    './chat-page.composer.scss',
    './chat-page.theme.scss',
    './chat-page.animations.scss',
    './chat-page.responsive.scss',
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPageComponent implements OnInit, OnDestroy {
  readonly store = inject(ChatStore);

  readonly sessionsStore = inject(ChatSessionsStore);

  readonly audio = inject(AudioPlaybackStore);

  readonly dictation = inject(DictationStore);

  readonly i18n = inject(TranslationService);

  readonly auth = inject(AuthStore);

  private readonly shellSearch = inject(ShellSearchService);

  /** Suppresses the animated playback indicator when the user prefers reduced motion. */
  readonly reducedMotion = prefersReducedMotion();

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  readonly draft = signal('');

  /** True while voice dictation is capturing — drives the mic/oracle UI. */
  readonly isListening = computed(() => this.dictation.isRecording());

  /** Whether any dictation path works; hides the mic button otherwise. */
  readonly micAvailable = this.dictation.isSupported();

  readonly sessionsOpen = signal(this.readSessionsPanelOpen());

  readonly railOpen = signal(this.readContextRailOpen());

  private sessionsMobileMq =
    typeof window !== 'undefined' ? window.matchMedia(SESSIONS_MOBILE_BREAKPOINT) : null;
  private readonly onSessionsMobileChange = (event: MediaQueryListEvent): void => {
    if (event.matches) {
      this.closeSessionsPanel();
    }
  };

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
    const agent = resolveRespondingAgent(this.store.routingHops());

    return agent ? this.agentLabel(agent) : this.i18n.t('chat.role.assistant');
  });

  /** Live status line while the backend routes agents or streams tokens. */
  readonly thinkingStatusLabel = computed(() => {
    if (!this.store.isStreaming()) {
      return '';
    }

    const latestAssistant = [...this.store.messages()]
      .reverse()
      .find((message) => message.role === 'assistant');

    if (latestAssistant?.content) {
      return this.i18n.t('chat.thinking.writing');
    }

    const activeTool = [...this.store.toolHops()].reverse().find((hop) => hop.status === 'active');

    if (activeTool) {
      return `${this.i18n.t('chat.thinking.tool')} ${this.toolLabel(activeTool.name)}…`;
    }

    const hops = this.store.routingHops();
    const activeHop = [...hops]
      .reverse()
      .find((hop) => hop.status === 'active' || hop.status === 'routing');

    if (activeHop?.status === 'routing') {
      return this.i18n.t('chat.thinking.routing');
    }

    if (activeHop) {
      return `${this.i18n.t('chat.thinking.consulting')} ${this.agentLabel(activeHop.agent)}…`;
    }

    return this.i18n.t('chat.thinking.analyzing');
  });

  private readonly composerInput = viewChild<ElementRef<HTMLInputElement>>('composerInput');
  private readonly messagesViewport = viewChild<ElementRef<HTMLElement>>('messagesViewport');

  constructor() {
    effect(() => {
      const userId = this.auth.user()?.id;

      if (userId) {
        this.sessionsStore.bootstrap(userId);
        void this.syncSessionRoute(this.route.snapshot.paramMap.get('sessionId'));

        return;
      }

      this.sessionsStore.clear();
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (!this.auth.user()?.id) {
        return;
      }
      void this.syncSessionRoute(params.get('sessionId'));
    });

    effect(() => {
      this.store.messages();
      this.store.isStreaming();
      this.thinkingStatusLabel();
      queueMicrotask(() => this.scrollToLatest());
    });
  }

  agentLabel(agent: string): string {
    const key = AGENT_LABEL_KEYS[agent];

    return key ? this.i18n.t(key) : agent;
  }

  agentGlyph(agent: string | null | undefined): MidasGlyphId | null {
    return agent ? resolveAgentGlyph(agent) : null;
  }

  messageAgent(message: ChatMessage): string | null {
    if (message.role !== 'assistant') {
      return null;
    }

    if (message.pending && this.isLatestAssistant(message.id)) {
      return resolveRespondingAgent(this.store.routingHops()) ?? message.agent ?? null;
    }

    return message.agent ?? null;
  }

  messageRoutingHops(message: ChatMessage): RoutingHop[] {
    if (message.role !== 'assistant') {
      return [];
    }

    if (message.pending && this.isLatestAssistant(message.id)) {
      return specialistRoutingHops(this.store.routingHops());
    }

    if (message.routingHops?.length) {
      return message.routingHops;
    }

    if (message.agent && message.agent !== 'supervisor') {
      return [{ agent: message.agent, status: 'done' }];
    }

    return [];
  }

  messageTools(message: ChatMessage): ToolHopSnapshot[] {
    if (message.pending && this.isLatestAssistant(message.id)) {
      return this.store.toolHops().map(({ name, status }) => ({ name, status }));
    }

    return message.tools ?? [];
  }

  toolLabel(name: string): string {
    return formatToolName(name);
  }

  isLatestAssistant(messageId: string): boolean {
    const assistants = this.store.messages().filter((m) => m.role === 'assistant');

    return assistants[assistants.length - 1]?.id === messageId;
  }

  isThinkingMessage(messageId: string, pending: boolean, content: string): boolean {
    if (!this.isLatestAssistant(messageId)) {
      return false;
    }
    if (content.trim()) {
      return false;
    }
    return pending || this.store.isStreaming();
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

  openContextRail(): void {
    this.setContextRailOpen(true);
  }

  closeContextRail(): void {
    this.setContextRailOpen(false);
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

    this.sessionsMobileMq?.addEventListener('change', this.onSessionsMobileChange);
    if (this.sessionsMobileMq?.matches) {
      this.closeSessionsPanel();
    }

    const pendingQuery = this.shellSearch.consumeChatDraftIntent();
    if (pendingQuery) {
      this.draft.set(pendingQuery);
    }

    const pendingReference = this.shellSearch.consumeChatReferenceIntent();
    if (pendingReference) {
      this.store.setReference(pendingReference);
    }
  }

  ngOnDestroy(): void {
    this.sessionsMobileMq?.removeEventListener('change', this.onSessionsMobileChange);

    document.documentElement.classList.remove('route-chat');

    document.body.classList.remove('route-chat');

    this.dictation.cancelDictation();

  }

  onSend(): void {
    if (!this.auth.isAuthenticated()) {
      return;
    }

    this.dictation.cancelDictation();

    const message = this.draft();

    this.draft.set('');

    void this.store.send(message);
  }

  /**
   * Click-only playback for a completed assistant message (never auto-speak on
   * stream completion — browser autoplay policy). Clicking the message that is
   * already playing toggles it off; the store handles the hybrid fallback.
   */
  speakMessage(messageId: string, content: string): void {
    void this.audio.play(messageId, content);
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

  onNewsQuestion(question: ChatNewsQuestion): void {
    if (!this.auth.isAuthenticated() || this.store.isStreaming()) {
      return;
    }
    this.draft.set(question.prompt);
    this.store.setReference(question.reference);
    this.focusComposer();
  }

  onDismissReference(): void {
    this.store.clearReference();
  }

  /**
   * Toggles voice dictation. Requires a user gesture (this click) — capture is
   * never auto-started. On stop, the transcribed text is appended to the
   * current draft so the user can review/edit it before sending. The hybrid
   * fallback is handled inside DictationStore's provider.
   */
  async toggleDictation(): Promise<void> {
    if (!this.canCompose() || !this.micAvailable) {
      return;
    }

    if (this.dictation.isRecording()) {
      const transcript = await this.dictation.stopDictation();
      this.appendTranscript(transcript);
      return;
    }

    await this.dictation.startDictation();
  }

  saveRealtimeConversation(turns: readonly RealtimeTurn[]): void {
    const messages: ChatMessage[] = turns.map((turn) => ({
      id: this.nextMessageId(),
      role: turn.role,
      content: turn.content,
      ...(turn.charts?.length ? { charts: [...turn.charts] } : {}),
    }));
    this.sessionsStore.appendActiveMessages(messages);
  }

  private appendTranscript(transcript: string): void {
    const clean = transcript.trim();
    if (!clean) {
      return;
    }

    const current = this.draft().trim();
    this.draft.set(current ? `${current} ${clean}` : clean);
  }

  private readSessionsPanelOpen(): boolean {
    if (typeof window !== 'undefined' && window.matchMedia(SESSIONS_MOBILE_BREAKPOINT).matches) {
      return false;
    }

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

  private readContextRailOpen(): boolean {
    if (typeof localStorage === 'undefined') {
      return true;
    }

    return localStorage.getItem(CONTEXT_RAIL_STORAGE_KEY) !== 'false';
  }

  private setContextRailOpen(open: boolean): void {
    this.railOpen.set(open);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CONTEXT_RAIL_STORAGE_KEY, String(open));
    }
  }

  private async syncSessionRoute(sessionId: string | null): Promise<void> {
    const resolvedId = this.sessionsStore.resolveSessionRoute(sessionId);
    if (sessionId !== resolvedId) {
      await this.router.navigate(['/chat', resolvedId], {
        replaceUrl: sessionId === null,
      });
    }
  }

  private scrollToLatest(): void {
    const viewport = this.messagesViewport()?.nativeElement;
    if (!viewport) {
      return;
    }
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
  }

  private nextMessageId(): string {
    return globalThis.crypto.randomUUID();
  }
}
