/**
 * A reference attached to a chat turn so Midas grounds its answer on a specific
 * market or news article. `asset` carries a ticker symbol; `news` carries a news
 * item id. `fromDate`/`toDate` (ISO `YYYY-MM-DD`) optionally narrow an asset
 * reference to a chart date window, so Midas explains the price move using that
 * period's news. The display fields (name/title/source) feed the reference chip
 * UI only; the id and the window are what travel on the wire.
 */
export type ChatReference =
  | { kind: 'asset'; symbol: string; name?: string; fromDate?: string; toDate?: string }
  | { kind: 'news'; newsId: string; title?: string; source?: string };
