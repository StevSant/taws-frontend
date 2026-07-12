/** One flagged unusual price move day from the Quant Analyst. */
export interface UnusualMove {
  date: Date;
  returnPct: number;
  zScore: number;
}
