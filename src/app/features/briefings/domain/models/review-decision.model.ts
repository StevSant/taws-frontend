/**
 * Reviewer decision on a signal or briefing — alert/task-shaped only (HU3).
 * Mirrors the backend's `ReviewDecision` StrEnum value-for-value. No
 * buy/sell/order/quantity decision exists anywhere in this workflow.
 */
export type ReviewDecision = 'reviewed' | 'escalated' | 'discarded';

/** Every decision, in display order for the review action buttons. */
export const REVIEW_DECISIONS: readonly ReviewDecision[] = ['reviewed', 'escalated', 'discarded'];

/**
 * Decisions that close the review workflow for an entity. Mirrors the
 * backend's authoritative transition rule
 * (`app/application/review/review_transition_policy.assert_transition_allowed`):
 * once an entity's latest decision is `reviewed` or `discarded`, no further
 * transition is allowed from either terminal state. `escalated` is NOT
 * terminal — it may still move to `reviewed`, `discarded`, or `escalated`
 * again. The UI mirrors this rule so it never offers an action the backend
 * would reject with `409`, but the backend remains the source of truth (a
 * concurrent request can still race past this client-side check).
 */
export const TERMINAL_REVIEW_DECISIONS: ReadonlySet<ReviewDecision> = new Set([
  'reviewed',
  'discarded',
]);
