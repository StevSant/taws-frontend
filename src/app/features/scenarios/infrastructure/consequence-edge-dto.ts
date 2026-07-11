/** Wire shape of `ConsequenceEdgeResponse`, embedded in `ConsequenceChainDto`. */
export interface ConsequenceEdgeDto {
  source_node_id: string;
  target_node_id: string;
  mechanism: string;
  confidence: number;
}
