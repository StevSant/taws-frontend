import { describe, expect, it } from 'vitest';

import { buildBoardroom } from './build-boardroom';
import { RoutingHop } from './models/routing-hop.model';
import { ToolHop } from './models/tool-call.model';

describe('buildBoardroom', () => {
  it('renders one card per parallel specialist and drops the supervisor hop', () => {
    const hops: RoutingHop[] = [
      { agent: 'supervisor', status: 'routing' },
      { agent: 'quant', status: 'active' },
      { agent: 'analyst', status: 'done' },
    ];

    const cards = buildBoardroom(hops, []);

    expect(cards.map((card) => card.agent)).toEqual(['quant', 'analyst']);
    expect(cards.find((card) => card.agent === 'quant')?.status).toBe('consulting');
    expect(cards.find((card) => card.agent === 'analyst')?.status).toBe('done');
  });

  it('marks a card using-tool when a tool is in flight for that agent', () => {
    const hops: RoutingHop[] = [{ agent: 'quant', status: 'active' }];
    const toolHops: ToolHop[] = [{ agent: 'quant', name: 'get_market_stats', status: 'active' }];

    const [quant] = buildBoardroom(hops, toolHops);

    expect(quant.status).toBe('using-tool');
    expect(quant.activeTool).toBe('get_market_stats');
  });

  it('does not surface a tool once the agent is done', () => {
    const hops: RoutingHop[] = [{ agent: 'quant', status: 'done' }];
    const toolHops: ToolHop[] = [{ agent: 'quant', name: 'get_market_stats', status: 'done' }];

    const [quant] = buildBoardroom(hops, toolHops);

    expect(quant.status).toBe('done');
    expect(quant.activeTool).toBeUndefined();
  });

  it('flags the advisor-labelled synthesizer in a multi-agent turn', () => {
    const hops: RoutingHop[] = [
      { agent: 'quant', status: 'done' },
      { agent: 'analyst', status: 'done' },
      { agent: 'advisor', status: 'active' },
    ];

    const cards = buildBoardroom(hops, []);

    expect(cards.find((card) => card.agent === 'advisor')?.isSynthesizer).toBe(true);
  });

  it('treats a lone advisor as a specialist, not the synthesizer', () => {
    const hops: RoutingHop[] = [{ agent: 'advisor', status: 'active' }];

    const [advisor] = buildBoardroom(hops, []);

    expect(advisor.isSynthesizer).toBe(false);
  });
});
