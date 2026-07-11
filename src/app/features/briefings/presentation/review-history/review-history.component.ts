import { Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslationKey, TranslationService } from '../../../../core';
import { ReviewDecision, ReviewState } from '../../domain';

const DECISION_LABELS: Record<ReviewDecision, TranslationKey> = {
  reviewed: 'briefings.review.decision.reviewed',
  escalated: 'briefings.review.decision.escalated',
  discarded: 'briefings.review.decision.discarded',
};

/**
 * Read-only audit trail for one briefing's past review decisions —
 * decision, justification, reviewer, and timestamp for every entry, newest
 * first. Purely presentational: `BriefingCardComponent` owns fetching via
 * `BriefingPanelStore`.
 */
@Component({
  selector: 'app-review-history',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './review-history.component.html',
  styleUrl: './review-history.component.scss',
})
export class ReviewHistoryComponent {
  @Input() history: ReviewState[] = [];

  constructor(readonly i18n: TranslationService) {}

  get orderedHistory(): ReviewState[] {
    return [...this.history].reverse();
  }

  decisionLabel(decision: ReviewDecision): string {
    return this.i18n.t(DECISION_LABELS[decision]);
  }
}
