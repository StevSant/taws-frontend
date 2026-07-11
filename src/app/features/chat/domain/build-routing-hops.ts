import { AgentTrace, AgentTraceEvent } from './models/agent-trace.model';
import { RoutingHop, RoutingHopStatus } from './models/routing-hop.model';

const STATUS_BY_TRACE_EVENT: Record<AgentTraceEvent, RoutingHopStatus> = {
  routing: 'routing',
  start: 'active',
  done: 'done',
};

/**
 * Collapses the raw `AgentTrace` event stream (one entry per `routing`/
 * `start`/`done` frame) into one display hop per *distinct agent*, in the
 * order each agent first appears.
 *
 * This is what keeps the routing breadcrumb from cluttering: a single
 * specialist turn emits 3 raw trace events (supervisor routing, specialist
 * start, specialist done) but collapses to exactly 2 hops ("Supervisor",
 * "Quant"), each hop's `status` updated in place as later events for the
 * same agent arrive. Forward-compatible with a future graph that routes to
 * more than one specialist per turn: each additional agent just becomes one
 * more hop, in encounter order, without any special-casing here.
 */
export function buildRoutingHops(traces: readonly AgentTrace[]): RoutingHop[] {
  const hops: RoutingHop[] = [];
  const hopIndexByAgent = new Map<string, number>();

  for (const trace of traces) {
    const status = STATUS_BY_TRACE_EVENT[trace.event];
    const existingIndex = hopIndexByAgent.get(trace.agent);

    if (existingIndex === undefined) {
      hopIndexByAgent.set(trace.agent, hops.length);
      hops.push({ agent: trace.agent, status, detail: trace.detail });
      continue;
    }

    const existing = hops[existingIndex];
    hops[existingIndex] = { ...existing, status, detail: trace.detail ?? existing.detail };
  }

  return hops;
}
