import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslationService } from '../../../../core';
import { FeaturePageHeaderComponent } from '../../../../shared';
import { NotesPanelComponent } from '../notes-panel/notes-panel.component';

/**
 * Dedicated notes page (`/notes`). Notes are one global per-user notepad — they were
 * never tied to a scenario or report, so they moved out of the "Notas" tab that used to
 * sit on the Scenario Lab and Reports pages and into their own top-level destination.
 *
 * All state lives in the root-scoped `NotesStore`, rendered through `NotesPanelComponent`;
 * the `NoteRepository → HttpNoteRepository` binding stays app-wide in `app.config.ts`
 * (a root-provided store can only resolve root-level dependencies).
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
}
