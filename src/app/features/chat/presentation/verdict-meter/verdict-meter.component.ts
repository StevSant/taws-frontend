import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { Verdict, VerdictAgent } from '../../domain';
import { countUpValue } from './count-up-value';

/** Maps a backend agent name to its i18n display-label key (mirrors the Boardroom). */
const AGENT_LABEL_KEYS: Record<string, TranslationKey> = {
  supervisor: 'chat.agent.supervisor',
  analyst: 'chat.agent.analyst',
  quant: 'chat.agent.quant',
  advisor: 'chat.agent.advisor',
  consequence: 'chat.agent.consequence',
  macro: 'chat.agent.macro',
  sentiment: 'chat.agent.sentiment',
};

/** A neutral, empty verdict so the component is safe to render before its input lands. */
const EMPTY_VERDICT: Verdict = { label: 'mixed', score: 50, agents: [], dissenters: [] };

/** Track midpoint (%) and the half-span each unit of confidence pushes a dot toward an edge. */
const TRACK_CENTER = 50;
const CONFIDENCE_SPAN = 50;

/** Dot opacity floor + how much confidence brightens it, so low-conviction dots read as faint. */
const DOT_OPACITY_FLOOR = 0.35;
const DOT_OPACITY_RANGE = 0.65;

/** How long the numeric score ticks up from 0 to its resolved reading (ms). */
const COUNT_UP_DURATION_MS = 800;

/**
 * Bull/bear verdict meter for a multi-agent turn. Collapses each specialist's
 * stance + confidence (via `buildVerdict`) into a single consensus reading: a
 * bear→bull track with a marker at `score`, the localized verdict label, and one
 * dot per agent placed by stance and confidence. Dissenters (agents bucking the
 * net direction) get a ringed dot and are named beneath. Renders nothing until at
 * least one contribution exists; the page shows it only for the latest turn.
 */
@Component({
  selector: 'app-verdict-meter',
  standalone: true,
  template: `
    @if (verdict.agents.length > 0) {
      <div class="verdict glass" role="group" [attr.aria-label]="i18n.t('verdict.title')">
        <div class="verdict__head">
          <span class="verdict__title">{{ i18n.t('verdict.title') }}</span>
          <span class="verdict__readout">
            <span class="verdict__score" [class]="labelClass()" [attr.aria-hidden]="true">{{
              displayScore()
            }}</span>
            <span class="verdict__verdict" [class]="labelClass()">{{ i18n.t(labelKey()) }}</span>
          </span>
        </div>

        <div
          class="verdict__track"
          [style.--verdict-score]="verdict.score"
          [attr.aria-hidden]="true"
        >
          <span
            class="verdict__fill"
            [class.verdict__fill--bull]="verdict.score >= 50"
            [class.verdict__fill--bear]="verdict.score < 50"
          ></span>
          <span class="verdict__marker" [style.left.%]="verdict.score"></span>
          @for (dot of agentDots(); track dot.agent) {
            <span
              class="verdict__dot"
              [class.verdict__dot--bull]="dot.stance === 'bull'"
              [class.verdict__dot--bear]="dot.stance === 'bear'"
              [class.verdict__dot--neutral]="dot.stance === 'neutral'"
              [class.verdict__dot--dissent]="dot.isDissenter"
              [style.left.%]="dot.position"
              [style.opacity]="dot.opacity"
              [attr.title]="agentLabel(dot.agent)"
            ></span>
          }
        </div>

        @if (verdict.dissenters.length > 0) {
          <p class="verdict__dissent" role="note">
            <span class="verdict__dissent-label">{{ i18n.t('verdict.dissent') }}</span>
            <span class="verdict__dissent-names">{{ dissenterLabels() }}</span>
          </p>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        margin-top: var(--space-2);
      }

      .verdict {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border);
        background: var(--glass-bg);
      }

      .verdict__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--space-2);
      }

      .verdict__title {
        font-family: var(--font-family-mono);
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-muted);
      }

      .verdict__verdict {
        font-family: var(--font-family-mono);
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .verdict__verdict--bull {
        color: var(--color-gain);
      }

      .verdict__verdict--bear {
        color: var(--color-loss);
      }

      .verdict__readout {
        display: inline-flex;
        align-items: baseline;
        gap: var(--space-2);
      }

      /* Numeric consensus reading — ticks up to the score when the turn resolves. */
      .verdict__score {
        font-family: var(--font-family-mono);
        font-size: 0.95rem;
        font-weight: 700;
        line-height: 1;
        font-variant-numeric: tabular-nums;
        color: var(--color-gold-bright, var(--color-gold));
      }

      .verdict__track {
        position: relative;
        height: 10px;
        border-radius: var(--radius-pill, 999px);
        background: linear-gradient(
          90deg,
          var(--color-loss-dim) 0%,
          var(--color-surface) 50%,
          var(--color-gain-dim) 100%
        );
        border: 1px solid var(--color-border);
      }

      /* Conviction fill sweeping in from the bearish edge up to the score point.
         Clipped to the track's own rounded box so its cap follows the pill. */
      .verdict__fill {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: calc(var(--verdict-score, 50) * 1%);
        max-width: 100%;
        border-radius: inherit;
        pointer-events: none;
        transform-origin: left center;
        animation: verdict-fill-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .verdict__fill--bull {
        background: linear-gradient(
          90deg,
          transparent,
          color-mix(in srgb, var(--color-gain) 22%, transparent)
        );
      }

      .verdict__fill--bear {
        background: linear-gradient(
          90deg,
          color-mix(in srgb, var(--color-loss) 22%, transparent),
          transparent
        );
      }

      .verdict__marker {
        position: absolute;
        top: -3px;
        bottom: -3px;
        width: 2px;
        transform: translateX(-1px);
        background: var(--color-gold);
        border-radius: 2px;
        box-shadow: 0 0 6px var(--color-gold);
        /* Needle drops onto the track as the reading settles. */
        animation: verdict-marker-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      .verdict__dot {
        position: absolute;
        top: 50%;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        background: var(--color-text-muted);
        border: 1px solid var(--color-surface);
      }

      .verdict__dot--bull {
        background: var(--color-gain);
      }

      .verdict__dot--bear {
        background: var(--color-loss);
      }

      .verdict__dot--neutral {
        background: var(--color-text-muted);
      }

      /* Dissent: a solid gold ring plus an attention halo pulsing outward, so a
         disagreeing voice reads at a glance even before the names below. */
      .verdict__dot--dissent {
        z-index: 2;
        box-shadow: 0 0 0 2px var(--color-gold);
        animation: verdict-dissent-pulse 1.8s ease-in-out infinite;
      }

      .verdict__dissent {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1);
        margin: 0;
        font-family: var(--font-family-mono);
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .verdict__dissent-label {
        color: var(--color-text-muted);
      }

      .verdict__dissent-names {
        color: var(--color-gold);
      }

      html[data-theme='light'] .verdict {
        background: var(--color-surface);
        border-color: var(--color-gold-border);
      }

      @keyframes verdict-fill-in {
        from {
          transform: scaleX(0);
          opacity: 0;
        }
        to {
          transform: scaleX(1);
          opacity: 1;
        }
      }

      @keyframes verdict-marker-in {
        from {
          opacity: 0;
          transform: translateX(-1px) scaleY(0.25);
        }
        to {
          opacity: 1;
          transform: translateX(-1px) scaleY(1);
        }
      }

      @keyframes verdict-dissent-pulse {
        0%,
        100% {
          box-shadow:
            0 0 0 2px var(--color-gold),
            0 0 0 2px color-mix(in srgb, var(--color-gold) 45%, transparent);
        }
        50% {
          box-shadow:
            0 0 0 2px var(--color-gold),
            0 0 0 6px color-mix(in srgb, var(--color-gold) 0%, transparent);
        }
      }

      /* Reduced motion: land on the resolved reading instantly — fill full, marker
         placed, dissent ring solid — with no sweep, drop, or pulse. The count-up
         itself is skipped in TypeScript (it shows the final score straight away). */
      @media (prefers-reduced-motion: reduce) {
        .verdict__fill,
        .verdict__marker,
        .verdict__dot--dissent {
          animation: none;
        }

        .verdict__fill {
          transform: scaleX(1);
          opacity: 1;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerdictMeterComponent implements OnChanges, OnDestroy {
  @Input() verdict: Verdict = EMPTY_VERDICT;

  readonly i18n = inject(TranslationService);

  /** The score currently shown in the readout; ticks up to `verdict.score`. */
  readonly displayScore = signal(0);

  private countUpFrame: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['verdict']) {
      return;
    }
    this.startCountUp(this.verdict.agents.length > 0 ? this.verdict.score : 0);
  }

  ngOnDestroy(): void {
    this.cancelCountUp();
  }

  /** i18n key for the current verdict band (`verdict.bearish` … `verdict.bullish`). */
  labelKey(): TranslationKey {
    return `verdict.${this.verdict.label}` as TranslationKey;
  }

  /** Tints the verdict word bull-green or bear-red at the leaning ends; neutral for mixed. */
  labelClass(): string {
    const label = this.verdict.label;
    if (label === 'bullish' || label === 'lean-bullish') {
      return 'verdict__verdict--bull';
    }
    if (label === 'bearish' || label === 'lean-bearish') {
      return 'verdict__verdict--bear';
    }
    return '';
  }

  /** Places each agent dot on the same 0..100 axis as the marker: confidence sets distance from center. */
  agentDots(): {
    agent: string;
    stance: VerdictAgent['stance'];
    position: number;
    opacity: number;
    isDissenter: boolean;
  }[] {
    const dissenters = new Set(this.verdict.dissenters);
    return this.verdict.agents.map((agent) => ({
      agent: agent.agent,
      stance: agent.stance,
      position: TRACK_CENTER + this.stanceSign(agent.stance) * agent.confidence * CONFIDENCE_SPAN,
      opacity: DOT_OPACITY_FLOOR + this.clampConfidence(agent.confidence) * DOT_OPACITY_RANGE,
      isDissenter: dissenters.has(agent.agent),
    }));
  }

  agentLabel(agent: string): string {
    const key = AGENT_LABEL_KEYS[agent];
    return key ? this.i18n.t(key) : agent;
  }

  dissenterLabels(): string {
    return this.verdict.dissenters.map((agent) => this.agentLabel(agent)).join(', ');
  }

  private stanceSign(stance: VerdictAgent['stance']): number {
    if (stance === 'bull') return 1;
    if (stance === 'bear') return -1;
    return 0;
  }

  private clampConfidence(confidence: number): number {
    return Math.min(1, Math.max(0, confidence));
  }

  /** Runs the count-up toward `target`, or jumps straight to it when motion is off. */
  private startCountUp(target: number): void {
    this.cancelCountUp();
    if (this.prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
      this.displayScore.set(target);
      return;
    }
    const from = 0;
    const start = Date.now();
    this.displayScore.set(countUpValue(from, target, 0));
    const tick = (): void => {
      const progress = (Date.now() - start) / COUNT_UP_DURATION_MS;
      this.displayScore.set(countUpValue(from, target, progress));
      this.countUpFrame = progress < 1 ? requestAnimationFrame(tick) : null;
    };
    this.countUpFrame = requestAnimationFrame(tick);
  }

  private cancelCountUp(): void {
    if (this.countUpFrame !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.countUpFrame);
    }
    this.countUpFrame = null;
  }

  /** SSR-safe read of the user's reduced-motion preference. */
  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
