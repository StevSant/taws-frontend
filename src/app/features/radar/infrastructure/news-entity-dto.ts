/** Wire shape of `NewsEntityResponse` as returned inside a `NewsItemResponse`. */
export interface NewsEntityDto {
  symbol: string;
  name: string;
  entity_type: string;
  industry?: string | null;
  match_score?: number | null;
  sentiment_score?: number | null;
}
