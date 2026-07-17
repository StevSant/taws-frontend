import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TranslationService } from '../../../../core';
import { AuthStore } from '../../../auth/application';
import { AnnotationDrawerStore, NotesStore } from '../../application';
import { NoteTarget, NoteTargetKind } from '../../domain';

/**
 * The one line a page adds to become annotatable. Shows how many notes exist about this
 * target and opens the shared drawer onto it.
 *
 * Takes its target explicitly rather than sniffing the route: the page already has its own
 * id and label in hand, and explicit beats inference.
 *
 * The pieces arrive as separate primitive inputs and are assembled here, rather than the
 * host passing a ready-made object. A host getter returning an object literal would hand
 * over a fresh identity on every change-detection pass, so the signal input would fire
 * every cycle and defeat OnPush. Primitives compare by value, so nothing churns.
 */
@Component({
  selector: 'app-notes-trigger-chip',
  standalone: true,
  templateUrl: './notes-trigger-chip.component.html',
  styleUrl: './notes-trigger-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesTriggerChipComponent {
  readonly kind = input.required<NoteTargetKind>();
  readonly targetId = input.required<string>();
  readonly label = input.required<string>();
  readonly watchlistId = input<string | null>(null);

  private readonly notes = inject(NotesStore);
  private readonly drawer = inject(AnnotationDrawerStore);
  private readonly auth = inject(AuthStore);
  readonly i18n = inject(TranslationService);

  /** A chip is only rendered by a page holding the live object, so this is always available. */
  readonly target = computed<NoteTarget>(() => ({
    kind: this.kind(),
    label: this.label(),
    targetId: this.targetId(),
    watchlistId: this.watchlistId(),
    available: true,
  }));

  readonly count = computed(() => this.notes.notesFor(this.target()).length);

  constructor() {
    // The count needs the notes loaded. `load()` is idempotent and root-scoped, so N chips
    // on a page cause one request, not N.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        void this.notes.load();
      }
    });
  }

  open(): void {
    this.drawer.open(this.target());
  }
}
