import { MidasAgentId } from '../../../shared';
import { TranslationKey } from '../../../core';

/** Product-facing profile for one Midas swarm agent. */
export interface AgentProfile {
  id: MidasAgentId;
  nameKey: TranslationKey;
  roleKey: TranslationKey;
  exampleKey: TranslationKey;
  /** Supervisor is the router; specialists are the workers. */
  kind: 'router' | 'specialist';
}

/**
 * Catalog aligned with backend `SupervisorRoute` specialists + supervisor.
 * Static domain data — no API required for the Agents page.
 */
export const AGENT_CATALOG: readonly AgentProfile[] = [
  {
    id: 'supervisor',
    nameKey: 'chat.agent.supervisor',
    roleKey: 'agents.role.supervisor',
    exampleKey: 'agents.example.supervisor',
    kind: 'router',
  },
  {
    id: 'analyst',
    nameKey: 'chat.agent.analyst',
    roleKey: 'agents.role.analyst',
    exampleKey: 'agents.example.analyst',
    kind: 'specialist',
  },
  {
    id: 'quant',
    nameKey: 'chat.agent.quant',
    roleKey: 'agents.role.quant',
    exampleKey: 'agents.example.quant',
    kind: 'specialist',
  },
  {
    id: 'macro',
    nameKey: 'chat.agent.macro',
    roleKey: 'agents.role.macro',
    exampleKey: 'agents.example.macro',
    kind: 'specialist',
  },
  {
    id: 'sentiment',
    nameKey: 'chat.agent.sentiment',
    roleKey: 'agents.role.sentiment',
    exampleKey: 'agents.example.sentiment',
    kind: 'specialist',
  },
  {
    id: 'consequence',
    nameKey: 'chat.agent.consequence',
    roleKey: 'agents.role.consequence',
    exampleKey: 'agents.example.consequence',
    kind: 'specialist',
  },
  {
    id: 'advisor',
    nameKey: 'chat.agent.advisor',
    roleKey: 'agents.role.advisor',
    exampleKey: 'agents.example.advisor',
    kind: 'specialist',
  },
];
