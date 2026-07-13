export type ChatCitationDto =
  | {
      kind: 'news';
      claim: string;
      publisher: string;
      title: string;
      url: string;
      published_at: string;
    }
  | {
      kind: 'signal';
      claim: string;
      symbol: string;
      impact: string;
      confidence: number;
      signal_id?: string;
    }
  | {
      kind: 'quant';
      claim: string;
      metric: string;
      value: string;
      as_of?: string;
      window?: string;
    }
  | {
      kind: 'macro';
      claim: string;
      indicator: string;
      value: string;
      as_of: string;
      provider: string;
    };
