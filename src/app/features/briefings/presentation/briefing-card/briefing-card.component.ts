import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationKey, TranslationService } from '../../../../core';
import { ButtonComponent } from '../../../../shared';
import { Briefing, LinkedSignal, ReviewDecision, ReviewState, SignalImpact } from '../../domain';
import {
  ReviewDecisionSubmitted,
  ReviewPanelComponent,
} from '../review-panel/review-panel.component';
import { ReviewHistoryComponent } from '../review-history/review-history.component';
import { linkedSignalImpactClass } from './linked-signal-impact-class';

const DECISION_LABELS: Record<ReviewDecision, TranslationKey> = {
  reviewed: 'briefings.review.decision.reviewed',
  escalated: 'briefings.review.decision.escalated',
  discarded: 'briefings.review.decision.discarded',
};

const IMPACT_LABELS: Record<SignalImpact, TranslationKey> = {
  positive: 'briefings.card.linkedSignals.impact.positive',
  negative: 'briefings.card.linkedSignals.impact.negative',
  neutral: 'briefings.card.linkedSignals.impact.neutral',
  uncertain: 'briefings.card.linkedSignals.impact.uncertain',
};

/** Backend sentinel `symbol` for a linked id it could not resolve. */
const UNRESOLVED_SYMBOL = '—';

/** Scales a 0..1 confidence to a whole-percent for the compact chip label. */
const PERCENT_MULTIPLIER = 100;

/** How many leading characters of a raw signal id to keep before eliding. */
const SIGNAL_ID_HEAD = 8;

/**
 * One generated briefing: summary, disclaimer, linked signal evidence, its
 * current review status badge, the review action form, and the audit
 * history — everything HU3 needs for a single briefing. No buy/sell
 * affordance exists anywhere in this card or its children.
 */
@Component({
  selector: 'app-briefing-card',
  standalone: true,
  imports: [DatePipe, RouterLink, ReviewPanelComponent, ReviewHistoryComponent, ButtonComponent],
  templateUrl: './briefing-card.component.html',
  styleUrl: './briefing-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BriefingCardComponent {
  @Input({ required: true }) briefing!: Briefing;
  @Input() history: ReviewState[] = [];
  @Input() isSubmitting = false;
  @Input() submitError: string | null = null;
  @Input() isExporting = false;
  @Input() exportError: string | null = null;
  @Output() submitReview = new EventEmitter<ReviewDecisionSubmitted>();
  @Output() exportPdf = new EventEmitter<void>();

  constructor(readonly i18n: TranslationService) {}

  get status(): ReviewDecision | 'pending' {
    return this.history.length > 0 ? this.history[this.history.length - 1].decision : 'pending';
  }

  statusLabel(status: ReviewDecision | 'pending'): string {
    return status === 'pending'
      ? this.i18n.t('briefings.card.status.pending')
      : this.i18n.t(DECISION_LABELS[status]);
  }

  /**
   * Whether to show the enriched linked-signal links. False when the backend
   * predates enrichment (empty `linkedSignals`) so the card falls back to the
   * de-emphasized raw-id chips instead of showing nothing.
   */
  get hasEnrichedSignals(): boolean {
    return this.briefing.linkedSignals.length > 0;
  }

  /** A linked signal the backend could not resolve — rendered as a non-link chip. */
  isUnresolved(signal: LinkedSignal): boolean {
    return signal.symbol === UNRESOLVED_SYMBOL;
  }

  /** BEM modifier class carrying the impact accent color for a linked-signal chip. */
  impactClass(impact: SignalImpact): string {
    return linkedSignalImpactClass(impact);
  }

  impactLabel(impact: SignalImpact): string {
    return this.i18n.t(IMPACT_LABELS[impact]);
  }

  /** Compact whole-percent form of a 0..1 confidence, e.g. 0.82 → 82. */
  confidencePercent(confidence: number): number {
    return Math.round(confidence * PERCENT_MULTIPLIER);
  }

  /**
   * Tidy a raw signal id for display: keep a short head and elide the rest.
   * Used only for the fallback (older data) and unresolved-signal chips.
   */
  shortSignalId(signalId: string): string {
    return signalId.length > SIGNAL_ID_HEAD ? `${signalId.slice(0, SIGNAL_ID_HEAD)}…` : signalId;
  }
}
