import { describe, expect, it } from 'vitest';
import { mapScenarioResultDto } from './map-scenario-result-dto';
import { ScenarioResultDto } from './scenario-result-dto';

const legacyDto: ScenarioResultDto = {
  id: 'scenario-1',
  spec: {
    entity: 'TEST',
    event_type: 'shock',
    magnitude: 'medium',
    horizon: 'short_term',
    title: 'Test',
    description: 'Test',
    affected_symbols: [],
    affected_asset_classes: [],
    preset_id: null,
  },
  title: 'Result',
  narrative: 'Narrative',
  impact_map: [],
  consequence_chain: {
    id: 'chain',
    subject: 'test',
    nodes: [],
    edges: [],
    disclaimer: 'research',
    created_at: '2026-07-12T00:00:00Z',
  },
  recommended_actions: [],
  disclaimer: 'research',
  created_at: '2026-07-12T00:00:00Z',
};

describe('mapScenarioResultDto', () => {
  it('defaults legacy responses without panel fields', () => {
    const result = mapScenarioResultDto(legacyDto);

    expect(result.agentContributions).toEqual([]);
    expect(result.consensus).toBeNull();
  });

  it('maps structured specialist contributions and consensus', () => {
    const result = mapScenarioResultDto({
      ...legacyDto,
      agent_contributions: [
        {
          agent_id: 'quant',
          status: 'completed',
          thesis: 'Quant thesis',
          confidence: 0.75,
          key_findings: ['Finding'],
        },
      ],
      consensus: {
        summary: 'Summary',
        conclusion: 'Conclusion',
        agreements: ['Agreement'],
        confidence: 0.6,
      },
    });

    expect(result.agentContributions[0]).toMatchObject({
      agentId: 'quant',
      thesis: 'Quant thesis',
      confidence: 0.75,
    });
    expect(result.consensus?.agreements).toEqual(['Agreement']);
    expect(result.consensus?.disagreements).toEqual([]);
  });
});
