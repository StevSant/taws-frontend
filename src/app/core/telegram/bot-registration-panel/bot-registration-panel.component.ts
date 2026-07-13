import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BotRegistrationStore } from '../bot-registration-store';
import { SendTestNewsStore } from '../send-test-news-store';
import { TranslationService } from '../../i18n';
import { ButtonComponent } from '../../../shared';

@Component({
  selector: 'app-bot-registration-panel',
  standalone: true,
  imports: [FormsModule, ButtonComponent],
  providers: [BotRegistrationStore, SendTestNewsStore],
  templateUrl: './bot-registration-panel.component.html',
  styleUrl: './bot-registration-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BotRegistrationPanelComponent {
  readonly i18n = inject(TranslationService);
  readonly store = inject(BotRegistrationStore);
  readonly testNewsStore = inject(SendTestNewsStore);

  readonly botfatherText = signal('');

  onRegister(): void {
    const text = this.botfatherText();
    if (!text.trim()) {
      return;
    }
    void this.store.register(text);
  }

  onSendTestNews(): void {
    void this.testNewsStore.sendTestNews();
  }
}
