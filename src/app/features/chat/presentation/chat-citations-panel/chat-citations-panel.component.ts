import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslationService } from '../../../../core';
import { ChatCitation } from '../../domain';

interface DisplayCitation {
  key: string;
  label: string;
  detail: string;
  url?: string;
}

const MARKDOWN_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

@Component({
  selector: 'app-chat-citations-panel',
  standalone: true,
  templateUrl: './chat-citations-panel.component.html',
  styleUrl: './chat-citations-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatCitationsPanelComponent {
  readonly content = input('');
  readonly citations = input<ChatCitation[]>([]);
  readonly i18n = inject(TranslationService);
  readonly displayCitations = computed(() => {
    const structured = this.citations().map((citation, index) =>
      this.toDisplayCitation(citation, index),
    );
    return structured.length > 0 ? structured : this.extractMarkdownCitations(this.content());
  });

  private extractMarkdownCitations(content: string): DisplayCitation[] {
    const citations: DisplayCitation[] = [];
    const seenUrls = new Set<string>();

    for (const match of content.matchAll(MARKDOWN_LINK)) {
      const [, label, url] = match;
      if (!label || !url || seenUrls.has(url)) {
        continue;
      }
      seenUrls.add(url);
      citations.push({ key: url, label, detail: '', url });
    }
    return citations;
  }

  private toDisplayCitation(citation: ChatCitation, index: number): DisplayCitation {
    switch (citation.kind) {
      case 'news':
        return {
          key: citation.url,
          label: `${citation.publisher} - ${citation.publishedAt.split('T')[0]}`,
          detail: citation.title,
          url: citation.url,
        };
      case 'signal':
        return {
          key: `signal-${citation.signalId ?? citation.symbol}-${index}`,
          label: `${citation.symbol} - ${citation.impact} (${Math.round(citation.confidence * 100)}%)`,
          detail: citation.claim,
        };
      case 'quant':
        return {
          key: `quant-${citation.metric}-${index}`,
          label: `${this.i18n.t('chat.citations.computed')} - ${citation.metric}: ${citation.value}`,
          detail: [citation.window, citation.asOf].filter(Boolean).join(' - ') || citation.claim,
        };
      case 'macro':
        return {
          key: `macro-${citation.indicator}-${index}`,
          label: `${citation.provider} - ${citation.indicator}: ${citation.value}`,
          detail: citation.asOf,
        };
    }
  }
}
