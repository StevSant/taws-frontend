import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { FeatureGuideComponent } from '../feature-guide/feature-guide.component';

type GuideNotesTab = 'guide' | 'notes';

@Component({
  selector: 'app-guide-notes-tabs',
  standalone: true,
  imports: [FeatureGuideComponent],
  templateUrl: './guide-notes-tabs.component.html',
  styleUrl: './guide-notes-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuideNotesTabsComponent {
  readonly guideTitle = input.required<string>();
  readonly guideSteps = input.required<readonly string[]>();
  readonly notesTitle = input.required<string>();

  /** Tab-header labels. Optional so callers can inject fully resolved i18n strings later. */
  readonly guideTabLabel = input('Guía');
  readonly notesTabLabel = input('Notas');

  readonly activeTab = signal<GuideNotesTab>('guide');

  selectTab(tab: GuideNotesTab): void {
    this.activeTab.set(tab);
  }
}
