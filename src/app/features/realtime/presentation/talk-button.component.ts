import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject } from '@angular/core';
import { AppConfigService, TranslationService } from '../../../core';
import { GoldenPolyhedronComponent } from '../../../shared';
import { PolyhedronActivity } from '../../../shared/golden-polyhedron/polyhedron-activity.model';
import { prefersReducedMotion } from '../../audio';
import { RealtimeStore } from '../application';
import { RealtimeSessionProvider } from '../domain';
import { RealtimeWebrtcService, isRealtimeSupported } from '../infrastructure';

const ORB_SIZE = 120;

/**
 * "Talk" toggle for the realtime voice agent — DISTINCT from the dictation mic
 * (that appends text to the composer; this opens a live spoken conversation).
 *
 * Self-contained: binds the RealtimeSessionProvider port to the WebRTC adapter
 * and provides its own RealtimeStore, so it can be dropped anywhere without
 * app-wide wiring. Shows the shared gold orb (GoldenPolyhedron), pulsing while
 * the model speaks; under prefers-reduced-motion the orb is forced to its
 * static idle frame. The button exposes `aria-pressed` + an i18n `aria-label`,
 * and the live transcript is announced through an `aria-live="polite"` region.
 *
 * When realtime is disabled (config flag off) the control is hidden entirely.
 * When it is enabled but the browser lacks WebRTC / `getUserMedia`, an
 * `unavailable` notice replaces the button so the user never clicks a control
 * that can only fail. Errors keep the button visible so the user can retry.
 */
@Component({
  selector: 'app-talk-button',
  standalone: true,
  imports: [GoldenPolyhedronComponent],
  providers: [
    RealtimeWebrtcService,
    { provide: RealtimeSessionProvider, useClass: RealtimeWebrtcService },
    RealtimeStore,
  ],
  templateUrl: './talk-button.component.html',
  styleUrl: './talk-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TalkButtonComponent implements OnDestroy {
  private readonly store = inject(RealtimeStore);
  private readonly config = inject(AppConfigService);
  readonly i18n = inject(TranslationService);

  readonly orbSize = ORB_SIZE;
  private readonly reducedMotion = prefersReducedMotion();

  readonly connectionState = this.store.connectionState;
  readonly liveTranscript = this.store.liveTranscript;
  readonly activeToolCall = this.store.activeToolCall;
  readonly permissionDenied = this.store.permissionDenied;

  private readonly browserSupported = isRealtimeSupported();

  /** The feature is turned on for this deployment. */
  private readonly enabled = this.config.realtimeEnabled;

  /** Whether the interactive button renders: flag on AND the browser can run WebRTC voice. */
  readonly available = computed(() => this.enabled && this.browserSupported);

  /** Flag on but the browser can't support it -> show the unavailable notice instead of a dead button. */
  readonly unavailable = computed(() => this.enabled && !this.browserSupported);

  readonly isLive = computed(() => this.connectionState() === 'live');
  readonly isConnecting = computed(() => this.connectionState() === 'connecting');
  readonly isPressed = computed(() => this.isLive() || this.isConnecting());

  /** Orb reactivity: pulse while the model speaks, spin while connecting, static under reduced motion. */
  readonly orbActivity = computed<PolyhedronActivity>(() => {
    if (this.reducedMotion) {
      return 'idle';
    }
    if (this.store.isModelSpeaking()) {
      return 'streaming';
    }
    if (this.isConnecting()) {
      return 'composing';
    }
    if (this.isLive()) {
      return 'listening';
    }
    return 'idle';
  });

  /** Status line under the orb, driven by connection state + active tool. */
  readonly statusLabel = computed(() => {
    const state = this.connectionState();
    if (state === 'connecting') {
      return this.i18n.t('chat.realtime.connecting');
    }
    if (state === 'error') {
      return this.permissionDenied()
        ? this.i18n.t('chat.realtime.permissionDenied')
        : this.i18n.t('chat.realtime.error');
    }
    if (state === 'live') {
      return this.activeToolCall()
        ? this.i18n.t('chat.realtime.toolRunning')
        : this.i18n.t('chat.realtime.live');
    }
    return this.i18n.t('chat.realtime.talk');
  });

  /** aria-label mirrors the action the click performs (start vs stop). */
  readonly ariaLabel = computed(() =>
    this.isPressed() ? this.i18n.t('chat.realtime.stop') : this.i18n.t('chat.realtime.talk'),
  );

  ngOnDestroy(): void {
    this.store.stop();
  }

  /** Click-only toggle (requires a user gesture — never auto-starts). */
  toggle(): void {
    if (this.isPressed()) {
      this.store.stop();
      return;
    }
    void this.store.start();
  }
}
