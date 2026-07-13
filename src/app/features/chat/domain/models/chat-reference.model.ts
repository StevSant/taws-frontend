/**
 * A reference attached to a chat turn so Midas grounds its answer on a specific
 * market or news article. `asset` carries a ticker symbol; `news` carries a news
 * item id. The extra display fields (name/title/source) feed the reference chip
 * UI only — they are not sent on the wire (the backend re-resolves from the id).
 */
export type ChatReference =
  | { kind: 'asset'; symbol: string; name?: string }
  | { kind: 'news'; newsId: string; title?: string; source?: string };
