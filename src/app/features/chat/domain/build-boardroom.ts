import { BoardroomAgent, BoardroomAgentStatus } from './models/boardroom-agent.model';
import { RoutingHop, RoutingHopStatus } from './models/routing-hop.model';
import { ToolHop } from './models/tool-call.model';

const STATUS_BY_HOP: Record<RoutingHopStatus, BoardroomAgentStatus> = {
  routing: 'routing',
  active: 'consulting',
  done: 'done',
};

/**
 * Builds the Boardroom view-model for a turn from the already-collapsed routing
 * and tool hops (`buildRoutingHops` / `buildToolHops`).
 *
 * The Supervisor hop is dropped — the board shows specialists only. An agent
 * with a tool still in flight is surfaced as `using-tool` (with the tool name)
 * rather than the plainer `consulting`, so the card reflects what it's doing.
 * See `BoardroomAgent` for the `isSynthesizer` heuristic.
 */
export function buildBoardroom(
  hops: readonly RoutingHop[],
  toolHops: readonly ToolHop[],
): BoardroomAgent[] {
  const specialists = hops.filter((hop) => hop.agent !== 'supervisor');
  const distinctAgents = new Set(specialists.map((hop) => hop.agent)).size;

  return specialists.map((hop) => {
    const isActive = hop.status === 'active';
    const activeTool = isActive
      ? [...toolHops].reverse().find((tool) => tool.agent === hop.agent && tool.status === 'active')
      : undefined;

    const status: BoardroomAgentStatus = activeTool ? 'using-tool' : STATUS_BY_HOP[hop.status];

    return {
      agent: hop.agent,
      status,
      ...(activeTool ? { activeTool: activeTool.name } : {}),
      isSynthesizer: hop.agent === 'advisor' && distinctAgents >= 2,
    };
  });
}
