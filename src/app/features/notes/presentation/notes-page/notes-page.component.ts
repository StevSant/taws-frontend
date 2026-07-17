import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslationService } from '../../../../core';
import { FeaturePageHeaderComponent } from '../../../../shared';
import { NotesFilter } from '../../domain';
import { NotesPanelComponent } from '../notes-panel/notes-panel.component';

/**
 * The notes inbox (`/notes`): every note the user has, linked or not, each showing what it
 * is about and linking back to it.
 *
 * This is the global view. Writing a note *about* something happens in the annotation
 * drawer, from the page you are reading — not here.
 */
@Component({
  selector: 'app-notes-page',
  standalone: true,
  imports: [FeaturePageHeaderComponent, NotesPanelComponent],
  templateUrl: './notes-page.component.html',
  styleUrl: './notes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPageComponent {
  readonly i18n = inject(TranslationService);
  readonly filter = signal<NotesFilter>('all');

  readonly filters: readonly NotesFilter[] = ['all', 'linked', 'unlinked'];

  filterLabel(filter: NotesFilter): string {
    switch (filter) {
      case 'all':
        return this.i18n.t('notes.page.filter.all');
      case 'linked':
        return this.i18n.t('notes.page.filter.linked');
      case 'unlinked':
        return this.i18n.t('notes.page.filter.unlinked');
    }
  }
}
