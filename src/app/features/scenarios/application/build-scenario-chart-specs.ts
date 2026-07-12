import { ChartSpec } from '../../../shared/charts';
import {
  ASSET_CLASSES,
  AssetClass,
  ConsequenceChain,
  ImpactDirection,
  ScenarioAssetClassImpact,
  ScenarioResult,
} from '../domain';

const SCENARIO_SOURCE = 'TAWS Scenario Lab';

function scenarioMeta(title: string, subtitle?: string): ChartSpec['meta'] {
  return {
    title,
    subtitle: subtitle ?? null,
    source: SCENARIO_SOURCE,
    symbol: null,
    timeframe: 'scenario',
    timeframes: [],
    request: { kind: 'distribution', symbols: [], timeframe: 'scenario' },
  };
}

function signedImpactValue(direction: ImpactDirection, confidence: number): number {
  const magnitude = confidence > 0 ? confidence : 0.12;
  switch (direction) {
    case 'positive':
      return magnitude;
    case 'negative':
      return -magnitude;
    case 'neutral':
      return magnitude * 0.35;
    case 'uncertain':
      return magnitude * 0.25;
  }
}

function truncate(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

/** Signed confidence bars for every asset class in the curated universe. */
export function buildScenarioImpactChartSpec(
  result: ScenarioResult,
  assetClassLabel: (assetClass: AssetClass) => string,
  title: string,
  subtitle: string,
): ChartSpec {
  const impactByClass = new Map<AssetClass, ScenarioAssetClassImpact>(
    result.impactMap.map((entry) => [entry.assetClass, entry]),
  );

  const points = ASSET_CLASSES.map((assetClass) => {
    const impact = impactByClass.get(assetClass);
    if (!impact) {
      return { x: assetClassLabel(assetClass), y: 0 };
    }
    return {
      x: assetClassLabel(assetClass),
      y: signedImpactValue(impact.direction, impact.confidence),
    };
  });

  return {
    type: 'distribution',
    series: [{ name: title, points, bars: [] }],
    xAxis: { label: '', type: 'category' },
    yAxis: { label: subtitle, type: 'value', format: 'percent' },
    meta: scenarioMeta(title, subtitle),
  };
}

/** Horizontal-style confidence bars for each causal edge (step index on the axis). */
export function buildScenarioCausalChartSpec(
  chain: ConsequenceChain,
  title: string,
  subtitle: string,
): ChartSpec | null {
  if (!chain.edges.length) {
    return null;
  }

  const nodeLabel = (nodeId: string): string =>
    chain.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;

  const points = chain.edges.map((edge, index) => {
    const label = truncate(`${nodeLabel(edge.sourceNodeId)} → ${nodeLabel(edge.targetNodeId)}`, 42);
    return {
      x: label || `Paso ${index + 1}`,
      y: edge.confidence,
    };
  });

  return {
    type: 'distribution',
    series: [{ name: title, points, bars: [] }],
    xAxis: { label: '', type: 'category' },
    yAxis: { label: subtitle, type: 'value', format: 'percent' },
    meta: scenarioMeta(title, subtitle),
  };
}
