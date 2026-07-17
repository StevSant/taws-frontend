import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { TranslationService } from '../../../../core';
import { EN_TRANSLATIONS } from '../../../../core/i18n/translations/en';
import { TranslationKey } from '../../../../core/i18n/translation-dict.model';
import { Briefing, LinkedSignal } from '../../domain';
import { BriefingCardComponent } from './briefing-card.component';

/**
 * The real TranslationService reads localStorage at construction, which the
 * unit-test environment does not provide — stub it with the EN dictionary.
 */
const I18N_STUB: Pick<TranslationService, 't' | 'locale'> = {
  t: (key: TranslationKey) => EN_TRANSLATIONS[key],
  locale: signal<'en'>('en').asReadonly(),
};

const RESOLVED_SIGNAL: LinkedSignal = {
  signalId: 'sig-resolved-0001',
  symbol: 'AAPL',
  impact: 'positive',
  confidence: 0.82,
  title: 'Strong earnings momentum',
};

const ARCHIVED_SIGNAL: LinkedSignal = {
  signalId: 'sig-archived-0002',
  symbol: 'MSFT',
  impact: 'uncertain',
  confidence: 0,
  title: '',
};

const UNRESOLVED_SIGNAL: LinkedSignal = {
  signalId: 'sig-unresolved-0003',
  symbol: '—',
  impact: 'uncertain',
  confidence: 0,
  title: '',
};

const BRIEFING: Briefing = {
  id: 'briefing-0001-0002-0003',
  watchlistId: 'watchlist-1',
  summary: 'A calm summary of the watchlist.',
  disclaimer: 'Not financial advice.',
  linkedSignalIds: [RESOLVED_SIGNAL.signalId, ARCHIVED_SIGNAL.signalId, UNRESOLVED_SIGNAL.signalId],
  linkedSignals: [RESOLVED_SIGNAL, ARCHIVED_SIGNAL, UNRESOLVED_SIGNAL],
  createdAt: '2026-07-16T00:00:00.000Z',
};

function createFixture() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [BriefingCardComponent],
    providers: [provideRouter([]), { provide: TranslationService, useValue: I18N_STUB }],
  });

  const fixture = TestBed.createComponent(BriefingCardComponent);
  fixture.componentRef.setInput('briefing', BRIEFING);
  fixture.detectChanges();
  return fixture;
}

describe('BriefingCardComponent', () => {
  it('detects an archived signal (symbol resolved, confidence 0, empty title)', () => {
    const component = createFixture().componentInstance;

    expect(component.isArchived(ARCHIVED_SIGNAL)).toBe(true);
    expect(component.isArchived(RESOLVED_SIGNAL)).toBe(false);
    expect(component.isArchived(UNRESOLVED_SIGNAL)).toBe(false);
  });

  it('detects an unresolved signal (sentinel symbol) and never marks it archived', () => {
    const component = createFixture().componentInstance;

    expect(component.isUnresolved(UNRESOLVED_SIGNAL)).toBe(true);
    expect(component.isUnresolved(ARCHIVED_SIGNAL)).toBe(false);
    expect(component.isUnresolved(RESOLVED_SIGNAL)).toBe(false);
  });

  it('renders a fully resolved signal as a link with its confidence percent', () => {
    const element: HTMLElement = createFixture().nativeElement;

    const chips = element.querySelectorAll<HTMLAnchorElement>('a.briefing-card__signal');
    const resolvedChip = chips[0];
    expect(resolvedChip.textContent).toContain('AAPL');
    expect(resolvedChip.querySelector('.briefing-card__signal-confidence')?.textContent).toContain(
      '82%',
    );
    expect(resolvedChip.querySelector('.briefing-card__signal-dot')).not.toBeNull();
  });

  it('renders an archived signal as a link without confidence or impact dot', () => {
    const element: HTMLElement = createFixture().nativeElement;

    const archivedChip = element.querySelector<HTMLAnchorElement>(
      'a.briefing-card__signal--archived',
    );
    expect(archivedChip).not.toBeNull();
    expect(archivedChip?.textContent).toContain('MSFT');
    expect(archivedChip?.textContent).toContain('Archived signal');
    expect(archivedChip?.querySelector('.briefing-card__signal-confidence')).toBeNull();
    expect(archivedChip?.querySelector('.briefing-card__signal-dot')).toBeNull();
  });

  it('renders an unresolved signal as a non-link chip', () => {
    const element: HTMLElement = createFixture().nativeElement;

    const unresolvedChip = element.querySelector('.briefing-card__signal--unresolved');
    expect(unresolvedChip).not.toBeNull();
    expect(unresolvedChip?.tagName).not.toBe('A');
    expect(unresolvedChip?.textContent).toContain('Signal unavailable');
  });
});
