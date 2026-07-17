import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TranslationService } from '../../../../core';
import { TranslationKey } from '../../../../core/i18n/translation-dict.model';
import { EN_TRANSLATIONS } from '../../../../core/i18n/translations/en';
import { Verdict } from '../../domain';
import { VerdictMeterComponent } from './verdict-meter.component';

const I18N_STUB: Pick<TranslationService, 't' | 'locale'> = {
  t: (key: TranslationKey) => EN_TRANSLATIONS[key],
  locale: signal<'en'>('en').asReadonly(),
};

function createFixture(verdict: Verdict) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [VerdictMeterComponent],
    providers: [{ provide: TranslationService, useValue: I18N_STUB }],
  });
  const fixture = TestBed.createComponent(VerdictMeterComponent);
  fixture.componentRef.setInput('verdict', verdict);
  fixture.detectChanges();
  return fixture;
}

const VERDICT: Verdict = {
  label: 'lean-bullish',
  score: 77,
  agents: [
    { agent: 'quant', stance: 'bull', confidence: 0.71 },
    { agent: 'analyst', stance: 'bull', confidence: 0.65 },
    { agent: 'macro', stance: 'bear', confidence: 0.4 },
  ],
  dissenters: ['macro'],
};

describe('VerdictMeterComponent', () => {
  it('renders one dot per agent', () => {
    const element: HTMLElement = createFixture(VERDICT).nativeElement;

    expect(element.querySelectorAll('.verdict__dot')).toHaveLength(3);
  });

  it('shows the localized verdict label', () => {
    const element: HTMLElement = createFixture(VERDICT).nativeElement;
    const label = element.querySelector('.verdict__verdict');

    expect(label?.textContent).toContain(EN_TRANSLATIONS['verdict.lean-bullish']);
  });

  it('flags dissenting agents with the dissent modifier and names them', () => {
    const element: HTMLElement = createFixture(VERDICT).nativeElement;

    expect(element.querySelectorAll('.verdict__dot--dissent')).toHaveLength(1);
    expect(element.querySelector('.verdict__dissent')?.textContent).toContain(
      EN_TRANSLATIONS['verdict.dissent'],
    );
  });

  it('renders nothing when there are no agents', () => {
    const empty: Verdict = { label: 'mixed', score: 50, agents: [], dissenters: [] };
    const element: HTMLElement = createFixture(empty).nativeElement;

    expect(element.querySelector('.verdict')).toBeNull();
  });
});
