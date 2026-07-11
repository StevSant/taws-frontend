import { ConsequenceNode } from '../domain';
import { ConsequenceNodeDto } from './consequence-node-dto';

/** Maps a `ConsequenceNodeDto` (snake_case wire shape) to the domain `ConsequenceNode`. */
export function mapConsequenceNodeDto(dto: ConsequenceNodeDto): ConsequenceNode {
  return {
    id: dto.id,
    label: dto.label,
  };
}
