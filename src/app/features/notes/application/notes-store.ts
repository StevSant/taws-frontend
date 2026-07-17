import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { AuthStore } from '../../auth/application';
import { Note, NoteRepository } from '../domain';

/**
 * Signal facade over the per-user notes API (issue #62). App-scoped (root-provided) so
 * state survives navigation; notes are a single global per-user list surfaced on the
 * dedicated /notes page. Every mutation updates the local list
 * optimistically-after-confirm (the repository call resolves first, then the signal is
 * patched) so the panel stays in sync without a full reload.
 *
 * Notes are per-user, so all reads/writes require a session: when unauthenticated, `load`
 * is a no-op and the panel shows a sign-in prompt instead of firing a doomed 401.
 */
@Injectable({ providedIn: 'root' })
export class NotesStore {
  private readonly notesSignal = signal<Note[]>([]);
  private readonly isLoadingSignal = signal(false);
  private readonly isSavingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private loaded = false;

  readonly notes = this.notesSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isSaving = this.isSavingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isEmpty = computed(() => !this.isLoadingSignal() && this.notesSignal().length === 0);

  constructor(
    private readonly repository: NoteRepository,
    private readonly auth: AuthStore,
  ) {}

  async load(options?: { force?: boolean }): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.notesSignal.set([]);
      this.loaded = false;
      return;
    }
    if (this.loaded && !options?.force) {
      return;
    }
    this.isLoadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      this.notesSignal.set(await this.repository.list());
      this.loaded = true;
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async add(body: string): Promise<boolean> {
    const trimmed = body.trim();
    if (!trimmed || this.isSavingSignal()) {
      return false;
    }
    this.isSavingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const note = await this.repository.create(trimmed);
      this.notesSignal.update((notes) => [note, ...notes]);
      return true;
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      return false;
    } finally {
      this.isSavingSignal.set(false);
    }
  }

  async edit(id: string, body: string): Promise<boolean> {
    const trimmed = body.trim();
    if (!trimmed || this.isSavingSignal()) {
      return false;
    }
    this.isSavingSignal.set(true);
    this.errorSignal.set(null);
    try {
      const updated = await this.repository.update(id, trimmed);
      this.notesSignal.update((notes) => notes.map((note) => (note.id === id ? updated : note)));
      return true;
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
      return false;
    } finally {
      this.isSavingSignal.set(false);
    }
  }

  async remove(id: string): Promise<void> {
    this.errorSignal.set(null);
    try {
      await this.repository.delete(id);
      this.notesSignal.update((notes) => notes.filter((note) => note.id !== id));
    } catch (error: unknown) {
      this.errorSignal.set(this.toErrorMessage(error));
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'network';
    }
    return error instanceof Error ? error.message : 'unknown';
  }
}
