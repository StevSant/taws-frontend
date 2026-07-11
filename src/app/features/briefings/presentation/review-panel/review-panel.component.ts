import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationKey, TranslationService } from '../../../../core';
import {
  REVIEW_DECISIONS,
  ReviewDecision,
  ReviewState,
  TERMINAL_REVIEW_DECISIONS,
} from '../../domain';

const DECISION_ACTION_LABELS: Record<ReviewDecision, TranslationKey> = {
  reviewed: 'briefings.review.action.reviewed',
  escalated: 'briefings.review.action.escalated',
  discarded: 'briefings.review.action.discarded',
};

export interface ReviewDecisionSubmitted {
  decision: ReviewDecision;
  justification: string;
}

/**
 * Review action UI for one briefing: a required justification input plus
 * mark-reviewed / escalate / discard buttons (HU3). Only alert/task
 * affordances — no buy/sell/execution control exists here.
 *
 * Once the entity's latest decision is terminal (`reviewed`/`discarded`,
 * per the backend's transition rule — see `TERMINAL_REVIEW_DECISIONS`), the
 * form is replaced by a "closed" notice instead of offering an action the
 * backend would reject with `409`.
 */
@Component({
  selector: 'app-review-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './review-panel.component.html',
  styleUrl: './review-panel.component.scss',
})
export class ReviewPanelComponent {
  @Input() history: ReviewState[] = [];
  @Input() isSubmitting = false;
  @Input() submitError: string | null = null;
  @Output() decide = new EventEmitter<ReviewDecisionSubmitted>();

  readonly justification = signal('');
  readonly decisions = REVIEW_DECISIONS;

  constructor(readonly i18n: TranslationService) {}

  get isTerminal(): boolean {
    const latest = this.latestDecision;
    return latest !== null && TERMINAL_REVIEW_DECISIONS.has(latest);
  }

  get latestDecision(): ReviewDecision | null {
    return this.history.length > 0 ? this.history[this.history.length - 1].decision : null;
  }

  get canSubmit(): boolean {
    return !this.isSubmitting && !this.isTerminal && this.justification().trim().length > 0;
  }

  actionLabel(decision: ReviewDecision): string {
    return this.i18n.t(DECISION_ACTION_LABELS[decision]);
  }

  onDecide(decision: ReviewDecision): void {
    const trimmed = this.justification().trim();
    if (!trimmed || this.isSubmitting || this.isTerminal) {
      return;
    }
    this.decide.emit({ decision, justification: trimmed });
    this.justification.set('');
  }
}
