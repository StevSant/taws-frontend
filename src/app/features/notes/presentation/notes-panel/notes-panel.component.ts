import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core';
import { AuthStore } from '../../../auth/application';
import { NotesStore } from '../../application';
import { Note, NoteTarget } from '../../domain';
import { NoteContextChipComponent } from '../note-context-chip/note-context-chip.component';

const NOTE_MAX_LENGTH = 2000;

/**
 * Functional notes panel (issue #62): add/edit/delete per-user notes. Rendered both by the
 * dedicated Notes page (`/notes`, global list) and inside the annotation drawer (one
 * target's notes) — see `target` below.
 *
 * Loads reactively once a session exists (an `effect` on `AuthStore.isAuthenticated`, so it
 * survives the async auth bootstrap); when unauthenticated it shows a sign-in prompt instead
 * of firing a doomed request. All persistence goes through `NotesStore` — this component
 * only owns transient editor state (the new-note draft and the inline edit buffer).
 */
@Component({
  selector: 'app-notes-panel',
  standalone: true,
  imports: [FormsModule, NoteContextChipComponent],
  templateUrl: './notes-panel.component.html',
  styleUrl: './notes-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPanelComponent {
  /** When set, the panel is about one target: it lists only that target's notes and files
   * new ones against it. When null it is the global list. Same component, both places. */
  readonly target = input<NoteTarget | null>(null);

  /** Show each note's context chip only in the global list — inside the drawer every note
   * has the same target, so a chip on each row would just be noise. */
  readonly showContext = input(false);

  readonly visibleNotes = computed(() => {
    const target = this.target();
    return target ? this.store.notesFor(target) : this.store.notes();
  });

  readonly isEmpty = computed(() => !this.store.isLoading() && this.visibleNotes().length === 0);

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
    const target = this.target();
    const added = await this.store.add(
      this.draft(),
      target?.targetId ? { kind: target.kind, targetId: target.targetId } : undefined,
    );
    if (added) {
      this.draft.set('');
    }
    // On failure the draft deliberately stays put: the user's words are theirs, and the
    // error message is what tells them what happened.
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
