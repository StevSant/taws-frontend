import { Injectable, signal } from '@angular/core';
import { NoteTarget } from '../domain';

/**
 * Which target the annotation drawer is currently open on.
 *
 * This is the indirection that stops every page from owning a note form: a page calls
 * `open(target)` and knows nothing else — not the drawer, not the composer, not the list.
 * The drawer itself is mounted once in the shell and reads this store. A fourth
 * annotatable page costs one line and no new UI.
 *
 * Root-provided: there is exactly one drawer in the app, so there is exactly one of these.
 */
@Injectable({ providedIn: 'root' })
export class AnnotationDrawerStore {
  private readonly isOpenSignal = signal(false);
  private readonly targetSignal = signal<NoteTarget | null>(null);

  readonly isOpen = this.isOpenSignal.asReadonly();
  readonly target = this.targetSignal.asReadonly();

  open(target: NoteTarget): void {
    this.targetSignal.set(target);
    this.isOpenSignal.set(true);
  }

  close(): void {
    // The target is deliberately kept: clearing it here would blank the drawer's contents
    // while it is still animating out.
    this.isOpenSignal.set(false);
  }
}
