import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslationService } from '../../../../core';

interface ChatCitation {
  label: string;
  url: string;
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
  readonly i18n = inject(TranslationService);
  readonly citations = computed(() => this.extractCitations(this.content()));

  private extractCitations(content: string): ChatCitation[] {
    const citations: ChatCitation[] = [];
    const seenUrls = new Set<string>();

    for (const match of content.matchAll(MARKDOWN_LINK)) {
      const [, label, url] = match;
      if (!label || !url || seenUrls.has(url)) {
        continue;
      }
      seenUrls.add(url);
      citations.push({ label, url });
    }
    return citations;
  }
}
