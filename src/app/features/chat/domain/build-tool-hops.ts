import { ToolCall, ToolHop, ToolHopSnapshot } from './models/tool-call.model';

/** Collapses raw tool start/done events into display hops (FIFO per tool name). */
export function buildToolHops(calls: readonly ToolCall[]): ToolHop[] {
  const hops: ToolHop[] = [];

  for (const call of calls) {
    if (call.event === 'start') {
      hops.push({ agent: call.agent, name: call.name, status: 'active' });
      continue;
    }

    const activeIndex = [...hops]
      .reverse()
      .findIndex((hop) => hop.name === call.name && hop.status === 'active');

    if (activeIndex === -1) {
      hops.push({ agent: call.agent, name: call.name, status: 'done' });
      continue;
    }

    const index = hops.length - 1 - activeIndex;
    hops[index] = { ...hops[index], status: 'done' };
  }

  return hops;
}

export function snapshotToolHops(hops: readonly ToolHop[]): ToolHopSnapshot[] {
  return hops.map(({ name, status }) => ({ name, status }));
}
