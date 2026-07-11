import { ConsequenceChain } from '../domain';
import { ConsequenceChainDto } from './consequence-chain-dto';
import { mapConsequenceEdgeDto } from './map-consequence-edge-dto';
import { mapConsequenceNodeDto } from './map-consequence-node-dto';

/** Maps a `ConsequenceChainDto` (snake_case wire shape) to the domain `ConsequenceChain`. */
export function mapConsequenceChainDto(dto: ConsequenceChainDto): ConsequenceChain {
  return {
    id: dto.id,
    subject: dto.subject,
    nodes: dto.nodes.map(mapConsequenceNodeDto),
    edges: dto.edges.map(mapConsequenceEdgeDto),
    disclaimer: dto.disclaimer,
    createdAt: dto.created_at,
  };
}
