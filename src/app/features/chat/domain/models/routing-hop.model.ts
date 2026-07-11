/**
 * Lifecycle of one agent's participation in the current turn's routing trace.
 * `routing` — the Supervisor picked a route (its own, standalone hop).
 * `active`  — a specialist has started working and hasn't finished yet.
 * `done`    — a specialist finished working.
 */
export type RoutingHopStatus = 'routing' | 'active' | 'done';

/**
 * One agent's pill in the routing breadcrumb (e.g. "Supervisor -> Quant").
 * `detail` carries the backend's optional free text (e.g. the Supervisor's
 * routing reason) for display as a tooltip.
 */
export interface RoutingHop {
  agent: string;
  status: RoutingHopStatus;
  detail?: string;
}
