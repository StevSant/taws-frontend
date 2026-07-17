import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TranslationService } from '../../../../core';
import { TranslationKey } from '../../../../core/i18n/translation-dict.model';
import { EN_TRANSLATIONS } from '../../../../core/i18n/translations/en';
import { BoardroomAgent, formatToolName } from '../../domain';
import { BoardroomComponent } from './boardroom.component';

const I18N_STUB: Pick<TranslationService, 't' | 'locale'> = {
  t: (key: TranslationKey) => EN_TRANSLATIONS[key],
  locale: signal<'en'>('en').asReadonly(),
};

function createFixture(agents: BoardroomAgent[]) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [BoardroomComponent],
    providers: [{ provide: TranslationService, useValue: I18N_STUB }],
  });
  const fixture = TestBed.createComponent(BoardroomComponent);
  fixture.componentRef.setInput('agents', agents);
  fixture.detectChanges();
  return fixture;
}

const AGENTS: BoardroomAgent[] = [
  { agent: 'quant', status: 'using-tool', activeTool: 'get_market_stats', isSynthesizer: false },
  { agent: 'analyst', status: 'done', isSynthesizer: false },
  { agent: 'advisor', status: 'consulting', isSynthesizer: true },
];

describe('BoardroomComponent', () => {
  it('renders one card per agent', () => {
    const element: HTMLElement = createFixture(AGENTS).nativeElement;

    expect(element.querySelectorAll('.boardroom__card')).toHaveLength(3);
  });

  it('shows the formatted tool name on the using-tool card', () => {
    const element: HTMLElement = createFixture(AGENTS).nativeElement;
    const toolCard = element.querySelector('.boardroom__card--tool');

    expect(toolCard).not.toBeNull();
    expect(toolCard?.textContent).toContain(formatToolName('get_market_stats'));
    expect(toolCard?.textContent).toContain(EN_TRANSLATIONS['boardroom.status.usingTool']);
  });

  it('labels the synthesizer card with the synthesizing status', () => {
    const element: HTMLElement = createFixture(AGENTS).nativeElement;
    const synthCard = element.querySelector('.boardroom__card--synthesizer');

    expect(synthCard).not.toBeNull();
    expect(synthCard?.textContent).toContain(EN_TRANSLATIONS['boardroom.status.synthesizing']);
    expect(synthCard?.textContent).toContain(EN_TRANSLATIONS['boardroom.synthesizer']);
  });

  it('renders nothing when there are no agents', () => {
    const element: HTMLElement = createFixture([]).nativeElement;

    expect(element.querySelector('.boardroom')).toBeNull();
  });
});
