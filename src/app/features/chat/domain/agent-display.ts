import { MidasAgentId, MidasGlyphId } from '../../../shared/midas-glyph/midas-glyph.model';
import { MIDAS_AGENT_GLYPHS, midasAgentGlyph } from '../../../shared/midas-glyph/midas-glyph-selection';
import { RoutingHop } from './models/routing-hop.model';

export function isKnownAgent(agent: string): agent is MidasAgentId {
  return agent in MIDAS_AGENT_GLYPHS;
}

export function resolveAgentGlyph(agent: string): MidasGlyphId | null {
  return isKnownAgent(agent) ? midasAgentGlyph(agent) : null;
}

/** Prefer the active specialist; fall back to the last completed non-supervisor hop. */
export function resolveRespondingAgent(hops: readonly RoutingHop[]): string | null {
  const active = [...hops]
    .reverse()
    .find((hop) => hop.status === 'active' && hop.agent !== 'supervisor');

  if (active) {
    return active.agent;
  }

  const done = [...hops]
    .reverse()
    .find((hop) => hop.status === 'done' && hop.agent !== 'supervisor');

  return done?.agent ?? null;
}

export function formatToolName(name: string): string {
  return name
    .replace(/^get_/, '')
    .replace(/^render_/, '')
    .replace(/^generate_/, '')
    .replace(/^analyze_/, '')
    .replace(/^run_/, '')
    .replace(/^interpret_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Specialist hops shown as tags under the Midas identity (supervisor is implicit). */
export function specialistRoutingHops(hops: readonly RoutingHop[]): RoutingHop[] {
  return hops.filter((hop) => hop.agent !== 'supervisor');
}

export function snapshotRoutingHops(hops: readonly RoutingHop[]): RoutingHop[] {
  return specialistRoutingHops(hops).map(({ agent, status, detail }) => ({
    agent,
    status: status === 'routing' ? 'done' : status,
    ...(detail ? { detail } : {}),
  }));
}
