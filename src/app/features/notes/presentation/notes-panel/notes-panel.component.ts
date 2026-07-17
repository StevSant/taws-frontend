import { ChangeDetectionStrategy, Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core';
import { AuthStore } from '../../../auth/application';
import { NotesStore } from '../../application';
import { Note } from '../../domain';

const NOTE_MAX_LENGTH = 2000;

/**
 * Functional notes panel (issue #62): add/edit/delete per-user notes. Rendered by the
 * dedicated Notes page (`/notes`) — notes are one global per-user list, not tied to any
 * scenario or report.
 *
 * Loads reactively once a session exists (an `effect` on `AuthStore.isAuthenticated`, so it
 * survives the async auth bootstrap); when unauthenticated it shows a sign-in prompt instead
 * of firing a doomed request. All persistence goes through `NotesStore` — this component
 * only owns transient editor state (the new-note draft and the inline edit buffer).
 */
@Component({
  selector: 'app-notes-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './notes-panel.component.html',
  styleUrl: './notes-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPanelComponent {
  readonly maxLength = NOTE_MAX_LENGTH;
  readonly draft = signal('');
  readonly editingId = signal<string | null>(null);
  readonly editDraft = signal('');

  constructor(
    readonly store: NotesStore,
    readonly auth: AuthStore,
    readonly i18n: TranslationService,
  ) {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        void this.store.load();
      }
    });
  }

  async onAdd(): Promise<void> {
    const added = await this.store.add(this.draft());
    if (added) {
      this.draft.set('');
    }
  }

  startEdit(note: Note): void {
    this.editingId.set(note.id);
    this.editDraft.set(note.body);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft.set('');
  }

  async saveEdit(id: string): Promise<void> {
    const saved = await this.store.edit(id, this.editDraft());
    if (saved) {
      this.cancelEdit();
    }
  }

  async onDelete(id: string): Promise<void> {
    if (this.editingId() === id) {
      this.cancelEdit();
    }
    await this.store.remove(id);
  }
}
