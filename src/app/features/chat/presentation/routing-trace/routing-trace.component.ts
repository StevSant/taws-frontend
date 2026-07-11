import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { RoutingHop, RoutingHopStatus } from '../../domain';

/** Maps a backend route/agent name to its i18n display-label key. */
const AGENT_LABEL_KEYS: Record<string, TranslationKey> = {
  supervisor: 'chat.agent.supervisor',
  analyst: 'chat.agent.analyst',
  quant: 'chat.agent.quant',
  advisor: 'chat.agent.advisor',
  consequence: 'chat.agent.consequence',
};

const STATUS_LABEL_KEYS: Record<RoutingHopStatus, TranslationKey> = {
  routing: 'chat.trace.routing',
  active: 'chat.trace.start',
  done: 'chat.trace.done',
};

/**
 * Renders the Supervisor's routing trace as a breadcrumb of pills, e.g.
 * "Supervisor -> Quant". One pill per distinct agent (`hops`, already
 * collapsed by `buildRoutingHops` — see `ChatStore.routingHops`), not one
 * per raw trace event, so a single-specialist turn shows exactly two pills
 * instead of three separate routing/start/done entries.
 *
 * Renders nothing when `hops` is empty (no trace yet, or the turn hasn't
 * started) and updates live as new hops/status changes arrive mid-stream.
 */
@Component({
  selector: 'app-routing-trace',
  standalone: true,
  templateUrl: './routing-trace.component.html',
  styleUrl: './routing-trace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutingTraceComponent {
  @Input() hops: RoutingHop[] = [];

  readonly i18n = inject(TranslationService);

  agentLabel(agent: string): string {
    const key = AGENT_LABEL_KEYS[agent];
    return key ? this.i18n.t(key) : agent;
  }

  statusLabel(status: RoutingHopStatus): string {
    return this.i18n.t(STATUS_LABEL_KEYS[status]);
  }
}
