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
  untracked,
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
  RoutingHop,
  ToolHopSnapshot,
  formatToolName,
  resolveAgentGlyph,
  resolveRespondingAgent,
  specialistRoutingHops,
} from '../../domain';

import {
  AudioPlaybackStore,
  DictationErrorReason,
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
import { ChatCitationsPanelComponent } from '../chat-citations-panel/chat-citations-panel.component';

import { ChatQuickActionsComponent } from '../chat-quick-actions/chat-quick-actions.component';

const HERO_SIZE_IDLE = 136;
const AVATAR_SIZE = 48;

/**
 * How close (in px) the viewport's scroll must be to the bottom to count as "following"
 * the conversation. Above this gap the user has scrolled up to read, so auto-scroll pauses.
 */
const NEAR_BOTTOM_PX = 80;

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

/**
 * Maps a classified dictation failure to a cause-specific hint. Everything the
 * providers can't tell apart lands on `failed` (the generic message).
 */
const DICTATION_ERROR_KEYS: Record<DictationErrorReason, TranslationKey> = {
  'permission-denied': 'chat.stt.permissionDenied',
  unsupported: 'chat.stt.unavailable',
  'server-unavailable': 'chat.stt.serverUnavailable',
  failed: 'chat.stt.error',
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
    ChatCitationsPanelComponent,

    ChatQuickActionsComponent,

    ChartComponent,

    TalkButtonComponent,
  ],

  providers: [
    // `ChatSessionsStore` and the `ChatRepository` binding are intentionally NOT provided here —
    // both are app-wide (root). The store is `providedIn: 'root'` so the live transcript (and its
    // client-side charts) survives navigation; because a root service can only resolve root
    // dependencies, its `ChatRepository` must live at root too (see `app.config.ts`, alongside
    // every other feature repository). `ChatStore` stays page-scoped: it only holds transient
    // per-turn streaming state and reads messages from the root sessions store.
    ChatStore,

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

  /** True during the transcription round-trip after recording stops. */
  readonly isTranscribing = computed(() => this.dictation.isTranscribing());

  /** Elapsed recording time as `m:ss`, ticking once per second, for the live capture status. */
  readonly recordingElapsedLabel = computed(() => {
    const total = this.dictation.elapsedSeconds();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  /** Cause-specific dictation error message, or empty when there is no error. */
  readonly dictationErrorMessage = computed(() => {
    const reason = this.dictation.error();
    return reason ? this.i18n.t(DICTATION_ERROR_KEYS[reason]) : '';
  });

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

  /**
   * True while auto-scroll should keep pinning to the newest content. Flipped off when the
   * user scrolls up to read, and back on when they return near the bottom, switch sessions,
   * send a message, or tap the jump-to-latest button.
   */
  readonly autoFollow = signal(true);

  /** Set while WE drive the scroll, so the scroll listener ignores our own scroll events. */
  private programmaticScroll = false;

  /** Id of the newest assistant message — memoized so per-row template calls stay O(1). */
  readonly latestAssistantId = computed(() => {
    const messages = this.store.messages();
    for (let index = messages.length - 1; index >= 0; index--) {
      if (messages[index].role === 'assistant') {
        return messages[index].id;
      }
    }
    return null;
  });

  /** Shows the jump-to-latest affordance only once the user has scrolled away from the tail. */
  readonly showJumpToLatest = computed(() => !this.autoFollow() && this.hasMessages());

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
        // The session list comes from the server now, so the route can only be resolved
        // once it has landed — everything after `bootstrap` awaits it. `untracked` keeps
        // the effect depending on the signed-in user ONLY: the async continuation reads
        // the sessions signal, which the streaming turn mutates on every token.
        untracked(() => void this.bootstrapSessions(userId));

        return;
      }

      this.sessionsStore.clear();
    });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      // Before the list has loaded there is nothing to resolve a route param against;
      // `bootstrapSessions` syncs the route itself once it lands.
      if (!this.auth.user()?.id || !this.sessionsStore.isReady()) {
        return;
      }
      void this.syncSessionRoute(params.get('sessionId'));
    });

    // Follow-scroll on new content — but only while the user is at the tail. The thinking
    // label is deliberately NOT a dependency (it changes on every routing/tool tick and used
    // to yank the viewport); async growth like late-rendering charts is handled by the
    // observer effect below instead.
    effect(() => {
      this.store.messages();
      this.store.isStreaming();
      if (!this.autoFollow()) {
        return;
      }
      queueMicrotask(() => this.scrollToLatest('auto'));
    });

    // Track the user's scroll intent and re-pin on container growth. Re-runs whenever the
    // conditionally-rendered viewport (@if hasMessages) mounts or remounts.
    effect((onCleanup) => {
      const viewport = this.messagesViewport()?.nativeElement;
      if (!viewport) {
        return;
      }

      const onScroll = (): void => {
        if (this.programmaticScroll) {
          return;
        }
        const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
        this.autoFollow.set(distance < NEAR_BOTTOM_PX);
      };
      viewport.addEventListener('scroll', onScroll, { passive: true });

      const repin = (): void => {
        if (this.autoFollow()) {
          this.scrollToLatest('auto');
        }
      };

      // A ResizeObserver on the scroll container only catches viewport resizes; content
      // growth (streaming text, charts) grows the message rows, so observe those too and
      // keep the set current via a MutationObserver on the list's children.
      const resizeObserver =
        typeof ResizeObserver !== 'undefined' ? new ResizeObserver(repin) : null;
      resizeObserver?.observe(viewport);
      for (const child of Array.from(viewport.children)) {
        resizeObserver?.observe(child);
      }

      const mutationObserver =
        typeof MutationObserver !== 'undefined'
          ? new MutationObserver((records) => {
              for (const record of records) {
                record.addedNodes.forEach((node) => {
                  if (node instanceof Element) {
                    resizeObserver?.observe(node);
                  }
                });
              }
              repin();
            })
          : null;
      mutationObserver?.observe(viewport, { childList: true });

      onCleanup(() => {
        viewport.removeEventListener('scroll', onScroll);
        resizeObserver?.disconnect();
        mutationObserver?.disconnect();
      });
    });

    // Switching conversations re-pins to the bottom of the newly active thread.
    effect(() => {
      this.sessionsStore.activeSessionId();
      this.autoFollow.set(true);
      queueMicrotask(() => this.scrollToLatest('auto'));
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
    return this.latestAssistantId() === messageId;
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

    // Sending is an explicit intent to watch the reply — always re-pin.
    this.autoFollow.set(true);

    void this.store.send(message);
  }

  /** Explicit user request to re-attach to the live tail (jump-to-latest button). */
  jumpToLatest(): void {
    this.autoFollow.set(true);
    this.scrollToLatest('smooth');
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
    // Asking about a rail news item opens a fresh chat (issue #73 follow-up).
    this.sessionsStore.createSession();
    this.draft.set(question.prompt);
    this.store.setReference(question.reference);
    this.focusComposer();
  }

  onDismissReference(): void {
    this.store.clearReference();
  }

  /**
   * Consumes a one-shot reference intent (from an asset/news detail "Preguntar a Midas")
   * and opens a fresh chat grounded on it. Called from the bootstrap effect AFTER the
   * session is resolved, so the new session is the final active one — not clobbered by
   * the bootstrap that runs after `ngOnInit` (issue #73 follow-up).
   */
  private applyPendingReferenceIntent(): void {
    const reference = this.shellSearch.consumeChatReferenceIntent();
    if (reference) {
      this.sessionsStore.createSession();
      this.store.setReference(reference);
    }
  }

  /**
   * Toggles voice dictation. Requires a user gesture (this click) — capture is
   * never auto-started. On stop, the transcribed text is appended to the
   * current draft so the user can review/edit it before sending. The hybrid
   * fallback is handled inside DictationStore's provider.
   */
  async toggleDictation(): Promise<void> {
    // Ignore clicks while the previous capture is still being transcribed —
    // otherwise a new recording would start on top of an in-flight round-trip.
    if (this.dictation.isTranscribing()) {
      return;
    }

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

  /**
   * Loads the signed-in user's conversations from the server, then resolves the route
   * against them. A pending market/news reference is applied LAST, so the fresh chat it
   * opens stays the active session (issue #73 follow-up).
   */
  private async bootstrapSessions(userId: string): Promise<void> {
    await this.sessionsStore.bootstrap(userId);
    await this.syncSessionRoute(this.route.snapshot.paramMap.get('sessionId'));
    this.applyPendingReferenceIntent();
  }

  private async syncSessionRoute(sessionId: string | null): Promise<void> {
    const resolvedId = this.sessionsStore.resolveSessionRoute(sessionId);
    if (sessionId !== resolvedId) {
      await this.router.navigate(['/chat', resolvedId], {
        replaceUrl: sessionId === null,
      });
    }
  }

  private scrollToLatest(behavior: ScrollBehavior = 'auto'): void {
    const viewport = this.messagesViewport()?.nativeElement;
    if (!viewport) {
      return;
    }
    // Guard the scroll listener against the event our own scrollTo emits, then release it on
    // the next frame so genuine user scrolls resume flipping `autoFollow`.
    this.programmaticScroll = true;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        this.programmaticScroll = false;
      });
    } else {
      this.programmaticScroll = false;
    }
  }

  private nextMessageId(): string {
    return globalThis.crypto.randomUUID();
  }
}
