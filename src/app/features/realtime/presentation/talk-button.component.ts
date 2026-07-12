import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { AppConfigService, TranslationService } from '../../../core';
import { prefersReducedMotion } from '../../audio';
import { RealtimeStore } from '../application';
import { RealtimeSessionProvider } from '../domain';
import { RealtimeWebrtcService, isRealtimeSupported } from '../infrastructure';
import { VoiceModeOverlayComponent } from './voice-mode-overlay.component';

/**
 * Compact "Talk to Midas" trigger for the realtime voice agent — DISTINCT from
 * the dictation mic (that appends text to the composer; this opens a live spoken
 * conversation). The trigger is a small gold pill with a soundwave glyph; it
 * renders NO orb of its own, so the page only ever shows ONE golden orb (the
 * chat hero's). The immersive single-orb experience lives entirely inside the
 * full-screen `VoiceModeOverlayComponent` this opens.
 *
 * Self-contained: binds the RealtimeSessionProvider port to the WebRTC adapter
 * and provides its own RealtimeStore, so it can be dropped anywhere without
 * app-wide wiring.
 *
 * When realtime is disabled (config flag off) or the browser lacks WebRTC /
 * `getUserMedia`, the trigger is hidden entirely so the user never clicks a
 * control that can only fail.
 */
@Component({
  selector: 'app-talk-button',
  standalone: true,
  imports: [VoiceModeOverlayComponent],
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

  private readonly reducedMotionValue = prefersReducedMotion();
  readonly reducedMotion = signal(this.reducedMotionValue);

  readonly connectionState = this.store.connectionState;
  readonly liveTranscript = this.store.liveTranscript;
  readonly activeToolCall = this.store.activeToolCall;
  readonly isModelSpeaking = this.store.isModelSpeaking;
  readonly permissionDenied = this.store.permissionDenied;

  /** True while the immersive voice-mode overlay is on screen. */
  readonly overlayOpen = signal(false);

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  private readonly browserSupported = isRealtimeSupported();

  /** The feature is turned on for this deployment. */
  private readonly enabled = this.config.realtimeEnabled;

  /** Whether the trigger renders: flag on AND the browser can run WebRTC voice. */
  readonly available = computed(() => this.enabled && this.browserSupported);

  ngOnDestroy(): void {
    this.store.stop();
  }

  /** Opens the immersive overlay and starts the session (requires this user gesture). */
  open(): void {
    if (this.overlayOpen()) {
      return;
    }
    this.overlayOpen.set(true);
    void this.store.start();
  }

  /** Stops the session, closes the overlay, and returns focus to the trigger. */
  close(): void {
    this.store.stop();
    this.overlayOpen.set(false);
    queueMicrotask(() => this.trigger()?.nativeElement.focus());
  }
}
