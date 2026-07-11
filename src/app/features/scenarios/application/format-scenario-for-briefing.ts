import { ScenarioResult } from '../domain';

/**
 * Formats a `ScenarioResult` as plain text for the "add to briefing"
 * workaround (see `ScenarioLabStore.addToBriefing` for why this exists: the
 * backend's briefing pipeline (`GenerateBriefing`, HU3) only generates
 * briefings from a watchlist's signals — there is no endpoint or field
 * anywhere that accepts an existing `ScenarioResult` id/payload. This
 * produces a copy-pasteable summary so a user can manually carry the
 * scenario's context into a briefing review until that gap is closed.
 */
export function formatScenarioForBriefing(result: ScenarioResult): string {
  const impactLines = result.impactMap.map(
    (impact) =>
      `- ${impact.assetClass}: ${impact.direction} (confidence ${Math.round(impact.confidence * 100)}%)`,
  );

  return [
    `Scenario: ${result.title}`,
    '',
    result.narrative,
    '',
    'Impact by asset class:',
    ...impactLines,
    '',
    `Recommended actions: ${result.recommendedActions.join('; ')}`,
    '',
    result.disclaimer,
  ].join('\n');
}
