import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { TranslationService } from '../../../core';
import { GoldenPolyhedronComponent, MidasGlyphComponent } from '../../../shared';
import { PolyhedronActivity } from '../../../shared/golden-polyhedron/polyhedron-activity.model';
import { RealtimeConnectionState } from '../domain';

const ORB_SIZE = 200;

/**
 * Immersive, full-screen voice-mode takeover — the ChatGPT-voice-mode UX for
 * Midas. A single large gold orb (the ONLY orb on screen while open — the trigger
 * never renders its own) sits centered over a dark MIDAS backdrop, reacting to
 * the live session state, with the status line, live transcript, and an "End"
 * control beneath it.
 *
 * Presentational by design: it owns NO transport and NO store. The parent
 * (`TalkButtonComponent`) feeds it the RealtimeStore's signals as inputs and
 * listens for `close` / `end`. That keeps the single source of truth in the
 * store and lets this component stay a pure `role="dialog"` surface.
 *
 * A11y: `role="dialog"` + `aria-modal`, an accessible label, a focus trap that
 * returns focus to the trigger on close, Esc-to-close, and an `aria-live`
 * transcript region. Under prefers-reduced-motion the orb is forced static.
 */
@Component({
  selector: 'app-voice-mode-overlay',
  standalone: true,
  imports: [GoldenPolyhedronComponent, MidasGlyphComponent],
  templateUrl: './voice-mode-overlay.component.html',
  styleUrl: './voice-mode-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceModeOverlayComponent {
  readonly i18n = inject(TranslationService);
  private readonly host = inject(ElementRef);

  readonly connectionState = input.required<RealtimeConnectionState>();
  readonly liveTranscript = input('');
  readonly isModelSpeaking = input(false);
  readonly activeToolCall = input<string | null>(null);
  readonly permissionDenied = input(false);
  readonly reducedMotion = input(false);

  /** Fired when the user ends the session (End button / Esc / backdrop). */
  readonly close = output<void>();

  readonly orbSize = ORB_SIZE;

  readonly waveformBars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

  private readonly endButton = viewChild.required<ElementRef<HTMLButtonElement>>('endButton');

  readonly isNotAvailable = computed(() => this.connectionState() === 'not-available');
  readonly isError = computed(() => this.connectionState() === 'error' && !this.isNotAvailable());
  readonly isConnecting = computed(() => this.connectionState() === 'connecting');
  readonly isLive = computed(() => this.connectionState() === 'live');

  /** Orb reactivity: energetic pulse while Midas speaks, spin while connecting, gentle when live, static under reduced motion. */
  readonly orbActivity = computed<PolyhedronActivity>(() => {
    if (this.reducedMotion() || this.isNotAvailable() || this.isError()) {
      return 'idle';
    }
    if (this.isModelSpeaking()) {
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
    if (state === 'not-available') {
      return this.i18n.t('chat.realtime.notAvailableTitle');
    }
    if (state === 'error') {
      return this.permissionDenied()
        ? this.i18n.t('chat.realtime.permissionDenied')
        : this.i18n.t('chat.realtime.error');
    }
    if (state === 'live') {
      if (this.activeToolCall()) {
        return this.i18n.t('chat.realtime.toolRunning');
      }
      return this.isModelSpeaking()
        ? this.i18n.t('chat.realtime.speaking')
        : this.i18n.t('chat.realtime.listening');
    }
    return this.i18n.t('chat.realtime.connecting');
  });

  constructor() {
    // Move focus into the dialog once it renders so keyboard + screen-reader
    // users land on the primary control (and the focus trap has something to
    // hold). The trigger restores its own focus on close.
    effect(() => {
      const button = this.endButton();
      queueMicrotask(() => button.nativeElement.focus());
    });
  }

  requestClose(): void {
    this.close.emit();
  }

  /** Esc closes the overlay; Tab is trapped so focus can't escape the dialog. */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }
    if (event.key === 'Tab') {
      this.trapTab(event);
    }
  }

  /**
   * Keeps Tab / Shift+Tab focus cycling within the dialog (this project has no
   * `@angular/cdk`, so the trap is hand-rolled). Wraps at both ends and pulls
   * focus back in if it ever lands outside the dialog's focusable set.
   */
  private trapTab(event: KeyboardEvent): void {
    const focusable = this.focusableElements();
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = active !== null && focusable.includes(active);

    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(): HTMLElement[] {
    const root = this.host.nativeElement as HTMLElement;
    const selector =
      'button:not([tabindex="-1"]):not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    return Array.from(root.querySelectorAll<HTMLElement>(selector));
  }
}
