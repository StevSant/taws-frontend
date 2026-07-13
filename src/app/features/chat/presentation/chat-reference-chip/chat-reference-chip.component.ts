import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core';
import { ChatReference } from '../../domain';

/**
 * A chip showing the market/news a chat question is grounded on. Links back to
 * the asset (`/radar/:symbol`) or the news article (`/radar/news/:id`).
 * `dismissable` shows a close button (pending chip, before send); it is omitted
 * once the reference is pinned to a sent message.
 */
@Component({
  selector: 'app-chat-reference-chip',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './chat-reference-chip.component.html',
  styleUrl: './chat-reference-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatReferenceChipComponent {
  readonly i18n = inject(TranslationService);

  readonly reference = input.required<ChatReference>();
  readonly dismissable = input(false);
  readonly dismiss = output<void>();

  readonly asset = computed(() => {
    const ref = this.reference();
    return ref.kind === 'asset' ? ref : null;
  });

  readonly news = computed(() => {
    const ref = this.reference();
    return ref.kind === 'news' ? ref : null;
  });

  readonly routerLink = computed<readonly unknown[]>(() => {
    const ref = this.reference();
    return ref.kind === 'asset' ? ['/radar', ref.symbol] : ['/radar/news', ref.newsId];
  });

  onDismiss(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.dismiss.emit();
  }
}
