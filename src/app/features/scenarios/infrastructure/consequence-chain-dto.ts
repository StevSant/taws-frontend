import { ConsequenceEdgeDto } from './consequence-edge-dto';
import { ConsequenceNodeDto } from './consequence-node-dto';

/** Wire shape of `ConsequenceChainResponse`, embedded in `ScenarioResultDto`. */
export interface ConsequenceChainDto {
  id: string;
  subject: string;
  nodes: ConsequenceNodeDto[];
  edges: ConsequenceEdgeDto[];
  disclaimer: string;
  created_at: string;
}
