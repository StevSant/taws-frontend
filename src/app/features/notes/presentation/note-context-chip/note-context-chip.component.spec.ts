import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { TranslationService } from '../../../../core';
import { TranslationKey } from '../../../../core/i18n/translation-dict.model';
import { EN_TRANSLATIONS } from '../../../../core/i18n/translations/en';
import { NoteTarget } from '../../domain';
import { NoteContextChipComponent } from './note-context-chip.component';

const I18N_STUB: Pick<TranslationService, 't' | 'locale'> = {
  t: (key: TranslationKey) => EN_TRANSLATIONS[key],
  locale: signal<'en'>('en').asReadonly(),
};

function createFixture(target: NoteTarget | null) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [NoteContextChipComponent],
    providers: [provideRouter([]), { provide: TranslationService, useValue: I18N_STUB }],
  });
  const fixture = TestBed.createComponent(NoteContextChipComponent);
  fixture.componentRef.setInput('target', target);
  fixture.detectChanges();
  return fixture;
}

const LIVE: NoteTarget = {
  kind: 'briefing',
  label: 'Crypto weakness after CPI',
  targetId: 'briefing-1',
  watchlistId: 'wl-7',
  available: true,
};

describe('NoteContextChipComponent', () => {
  it('renders a link for a live target', () => {
    const element: HTMLElement = createFixture(LIVE).nativeElement;
    const link = element.querySelector('a');

    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Crypto weakness after CPI');
    expect(link?.textContent).toContain(EN_TRANSLATIONS['notes.target.briefing']);
  });

  it('renders a deleted target as inert text, keeping the label and saying it is gone', () => {
    const element: HTMLElement = createFixture({
      ...LIVE,
      targetId: null,
      watchlistId: null,
      available: false,
    }).nativeElement;

    expect(element.querySelector('a')).toBeNull();
    expect(element.textContent).toContain('Crypto weakness after CPI');
    expect(element.textContent).toContain(EN_TRANSLATIONS['notes.target.unavailable']);
  });

  it('renders an unlinked note as "unlinked"', () => {
    const element: HTMLElement = createFixture(null).nativeElement;

    expect(element.querySelector('a')).toBeNull();
    expect(element.textContent).toContain(EN_TRANSLATIONS['notes.target.none']);
  });
});
