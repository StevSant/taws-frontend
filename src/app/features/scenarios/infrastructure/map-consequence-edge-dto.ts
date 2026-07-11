import { ConsequenceEdge } from '../domain';
import { ConsequenceEdgeDto } from './consequence-edge-dto';

/** Maps a `ConsequenceEdgeDto` (snake_case wire shape) to the domain `ConsequenceEdge`. */
export function mapConsequenceEdgeDto(dto: ConsequenceEdgeDto): ConsequenceEdge {
  return {
    sourceNodeId: dto.source_node_id,
    targetNodeId: dto.target_node_id,
    mechanism: dto.mechanism,
    confidence: dto.confidence,
  };
}
