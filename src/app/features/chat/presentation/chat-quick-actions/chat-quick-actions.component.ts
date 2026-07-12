import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { LucideFileText, LucideGitCompare, LucideRadar, LucideZap } from '@lucide/angular';
import { TranslationKey, TranslationService } from '../../../../core';

type ChatQuickActionIcon = 'radar' | 'signals' | 'briefing' | 'compare';

interface ChatQuickAction {
  readonly icon: ChatQuickActionIcon;
  readonly titleKey: TranslationKey;
  readonly descKey: TranslationKey;
  readonly suggestionKey: TranslationKey;
}

const QUICK_ACTIONS: readonly ChatQuickAction[] = [
  {
    icon: 'radar',
    titleKey: 'chat.action.radar.title',
    descKey: 'chat.action.radar.desc',
    suggestionKey: 'chat.suggestion.news',
  },
  {
    icon: 'signals',
    titleKey: 'chat.action.signals.title',
    descKey: 'chat.action.signals.desc',
    suggestionKey: 'chat.suggestion.quant',
  },
  {
    icon: 'briefing',
    titleKey: 'chat.action.briefing.title',
    descKey: 'chat.action.briefing.desc',
    suggestionKey: 'chat.suggestion.macro',
  },
  {
    icon: 'compare',
    titleKey: 'chat.action.compare.title',
    descKey: 'chat.action.compare.desc',
    suggestionKey: 'chat.suggestion.compare',
  },
];

@Component({
  selector: 'app-chat-quick-actions',
  standalone: true,
  imports: [LucideRadar, LucideZap, LucideFileText, LucideGitCompare],
  templateUrl: './chat-quick-actions.component.html',
  styleUrl: './chat-quick-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatQuickActionsComponent {
  readonly i18n = inject(TranslationService);

  readonly disabled = input(false);
  readonly select = output<string>();

  readonly actions = QUICK_ACTIONS;

  onSelect(action: ChatQuickAction): void {
    this.select.emit(action.suggestionKey);
  }
}
