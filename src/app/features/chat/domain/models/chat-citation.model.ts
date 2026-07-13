interface ChatCitationBase {
  claim: string;
}

export interface NewsChatCitation extends ChatCitationBase {
  kind: 'news';
  publisher: string;
  title: string;
  url: string;
  publishedAt: string;
}

export interface SignalChatCitation extends ChatCitationBase {
  kind: 'signal';
  symbol: string;
  impact: string;
  confidence: number;
  signalId?: string;
}

export interface QuantChatCitation extends ChatCitationBase {
  kind: 'quant';
  metric: string;
  value: string;
  asOf?: string;
  window?: string;
}

export interface MacroChatCitation extends ChatCitationBase {
  kind: 'macro';
  indicator: string;
  value: string;
  asOf: string;
  provider: string;
}

export type ChatCitation =
  NewsChatCitation | SignalChatCitation | QuantChatCitation | MacroChatCitation;
