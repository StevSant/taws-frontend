import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { TranslationService } from '../../core';

/**
 * Minimal reusable pager: "Anterior / Página X de Y / Siguiente". 1-based pages.
 * Presentation-agnostic — the parent owns the paged slice and just reacts to
 * `pageChange`. Buttons disable at the bounds; the component renders nothing
 * useful for a single page, so callers should gate it on `totalPages > 1`.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  @Input({ required: true }) page = 1;
  @Input({ required: true }) totalPages = 1;
  @Output() pageChange = new EventEmitter<number>();

  readonly i18n = inject(TranslationService);

  get isFirst(): boolean {
    return this.page <= 1;
  }

  get isLast(): boolean {
    return this.page >= this.totalPages;
  }

  previous(): void {
    if (!this.isFirst) {
      this.pageChange.emit(this.page - 1);
    }
  }

  next(): void {
    if (!this.isLast) {
      this.pageChange.emit(this.page + 1);
    }
  }
}
