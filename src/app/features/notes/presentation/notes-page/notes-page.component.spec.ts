import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TranslationService } from '../../../../core';
import { EN_TRANSLATIONS } from '../../../../core/i18n/translations/en';
import { TranslationKey } from '../../../../core/i18n/translation-dict.model';
import { AuthStore } from '../../../auth/application';
import { NotesStore } from '../../application';
import { Note } from '../../domain';
import { NotesPageComponent } from './notes-page.component';

/**
 * The real TranslationService reads localStorage at construction, which the
 * unit-test environment does not provide — stub it with the EN dictionary.
 */
const I18N_STUB: Pick<TranslationService, 't' | 'locale'> = {
  t: (key: TranslationKey) => EN_TRANSLATIONS[key],
  locale: signal<'en'>('en').asReadonly(),
};

const AUTH_STUB: Pick<AuthStore, 'isAuthenticated'> = {
  isAuthenticated: signal(true).asReadonly(),
};

const NOTES: Note[] = [
  {
    id: 'note-0001',
    userId: 'user-1',
    body: 'Watch the NVDA earnings gap.',
    target: null,
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
  },
  {
    id: 'note-0002',
    userId: 'user-1',
    body: 'Compare BTC drawdown vs 2024 halving.',
    target: null,
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
  },
];

type NotesStoreStub = Pick<
  NotesStore,
  'notes' | 'isLoading' | 'isSaving' | 'error' | 'isEmpty' | 'load' | 'add' | 'edit' | 'remove'
>;

const NOTES_STORE_STUB: NotesStoreStub = {
  notes: signal(NOTES).asReadonly(),
  isLoading: signal(false).asReadonly(),
  isSaving: signal(false).asReadonly(),
  error: signal<string | null>(null).asReadonly(),
  isEmpty: signal(false).asReadonly(),
  load: () => Promise.resolve(),
  add: () => Promise.resolve(true),
  edit: () => Promise.resolve(true),
  remove: () => Promise.resolve(),
};

function createFixture() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [NotesPageComponent],
    providers: [
      { provide: TranslationService, useValue: I18N_STUB },
      { provide: AuthStore, useValue: AUTH_STUB },
      { provide: NotesStore, useValue: NOTES_STORE_STUB },
    ],
  });

  const fixture = TestBed.createComponent(NotesPageComponent);
  fixture.detectChanges();
  return fixture;
}

describe('NotesPageComponent', () => {
  it('renders the page title and subtitle', () => {
    const element: HTMLElement = createFixture().nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain(EN_TRANSLATIONS['notes.page.title']);
    expect(element.textContent).toContain(EN_TRANSLATIONS['notes.page.subtitle']);
  });

  it('shows the notes from the store', () => {
    const element: HTMLElement = createFixture().nativeElement;

    const bodies = [...element.querySelectorAll('.notes-panel__body')].map((node) =>
      node.textContent?.trim(),
    );
    expect(bodies).toEqual([NOTES[0].body, NOTES[1].body]);
  });

  it('renders the add-note composer with its submit button', () => {
    const element: HTMLElement = createFixture().nativeElement;

    const addButton = element.querySelector<HTMLButtonElement>(
      '.notes-panel__composer button[type="submit"]',
    );
    expect(addButton).not.toBeNull();
    expect(addButton?.textContent).toContain(EN_TRANSLATIONS['notes.panel.add']);
  });
});
