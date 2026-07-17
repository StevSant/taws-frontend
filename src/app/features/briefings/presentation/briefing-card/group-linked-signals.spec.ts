import { describe, expect, it } from 'vitest';
import { LinkedSignal } from '../../domain';
import { groupLinkedSignals } from './group-linked-signals';

function active(symbol: string, signalId: string): LinkedSignal {
  return { signalId, symbol, impact: 'positive', confidence: 0.7, title: 'Live thesis' };
}

function archived(symbol: string, signalId: string): LinkedSignal {
  return { signalId, symbol, impact: 'uncertain', confidence: 0, title: '' };
}

function unresolved(signalId: string): LinkedSignal {
  return { signalId, symbol: '—', impact: 'uncertain', confidence: 0, title: '' };
}

describe('groupLinkedSignals', () => {
  it('returns empty buckets for no signals', () => {
    expect(groupLinkedSignals([])).toEqual({
      active: [],
      archived: [],
      archivedTotal: 0,
      unresolvedCount: 0,
    });
  });

  it('keeps live signals in the active bucket individually', () => {
    const signals = [active('AAPL', 'a1'), active('MSFT', 'a2')];

    const grouped = groupLinkedSignals(signals);

    expect(grouped.active).toEqual(signals);
    expect(grouped.archived).toEqual([]);
    expect(grouped.unresolvedCount).toBe(0);
  });

  it('dedupes archived signals by ticker and counts them', () => {
    const grouped = groupLinkedSignals([
      archived('USDT', 'x1'),
      archived('USDT', 'x2'),
      archived('MSFT', 'x3'),
      archived('USDT', 'x4'),
    ]);

    expect(grouped.archived).toEqual([
      { symbol: 'USDT', count: 3 },
      { symbol: 'MSFT', count: 1 },
    ]);
    expect(grouped.archivedTotal).toBe(4);
    expect(grouped.active).toEqual([]);
  });

  it('orders archived groups by count desc, then ticker asc', () => {
    const grouped = groupLinkedSignals([
      archived('GOOGL', 'g1'),
      archived('COIN', 'c1'),
      archived('COIN', 'c2'),
      archived('AAPL', 'a1'),
      archived('COIN', 'c3'),
      archived('GOOGL', 'g2'),
    ]);

    expect(grouped.archived).toEqual([
      { symbol: 'COIN', count: 3 },
      { symbol: 'GOOGL', count: 2 },
      { symbol: 'AAPL', count: 1 },
    ]);
  });

  it('counts unresolved signals separately from active and archived', () => {
    const grouped = groupLinkedSignals([
      active('AAPL', 'a1'),
      archived('USDT', 'x1'),
      unresolved('u1'),
      unresolved('u2'),
    ]);

    expect(grouped.active).toHaveLength(1);
    expect(grouped.archivedTotal).toBe(1);
    expect(grouped.unresolvedCount).toBe(2);
  });
});
