import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { Briefing, ReviewDecision, ReviewState } from '../../domain';
import {
  ReviewDecisionSubmitted,
  ReviewPanelComponent,
} from '../review-panel/review-panel.component';
import { ReviewHistoryComponent } from '../review-history/review-history.component';

const DECISION_LABELS: Record<ReviewDecision, TranslationKey> = {
  reviewed: 'briefings.review.decision.reviewed',
  escalated: 'briefings.review.decision.escalated',
  discarded: 'briefings.review.decision.discarded',
};

/**
 * One generated briefing: summary, disclaimer, linked signal evidence, its
 * current review status badge, the review action form, and the audit
 * history — everything HU3 needs for a single briefing. No buy/sell
 * affordance exists anywhere in this card or its children.
 */
@Component({
  selector: 'app-briefing-card',
  standalone: true,
  imports: [DatePipe, ReviewPanelComponent, ReviewHistoryComponent],
  templateUrl: './briefing-card.component.html',
  styleUrl: './briefing-card.component.scss',
})
export class BriefingCardComponent {
  @Input({ required: true }) briefing!: Briefing;
  @Input() history: ReviewState[] = [];
  @Input() isSubmitting = false;
  @Input() submitError: string | null = null;
  @Output() submitReview = new EventEmitter<ReviewDecisionSubmitted>();

  constructor(readonly i18n: TranslationService) {}

  get status(): ReviewDecision | 'pending' {
    return this.history.length > 0 ? this.history[this.history.length - 1].decision : 'pending';
  }

  statusLabel(status: ReviewDecision | 'pending'): string {
    return status === 'pending'
      ? this.i18n.t('briefings.card.status.pending')
      : this.i18n.t(DECISION_LABELS[status]);
  }
}
