import { DatePipe } from '@angular/common';
import { Component, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core';
import {
  ActivityFeedComponent,
  ActivityFeedItem,
  ButtonComponent,
  EmptyStateComponent,
  FeaturePageHeaderComponent,
  GuideNotesTabsComponent,
  SkeletonCardComponent,
} from '../../../../shared';
import { AuthStore } from '../../../auth/application';
import { ScenarioIntakeMode, ScenarioLabStore } from '../../application';
import { PresetPickerComponent } from '../preset-picker/preset-picker.component';
import { ScenarioResultViewComponent } from '../scenario-result-view/scenario-result-view.component';

const FREE_TEXT_MAX_LENGTH = 1000;

/** Placeholder — no notes feature exists yet; keeps `app-guide-notes-tabs`'s Notes tab wired but empty. */
const EMPTY_SCENARIO_NOTES: readonly string[] = [];

/**
 * Scenario Lab page (issue #13, extended by #20, plus #34's "arm monitor"
 * action): pick a curated preset or describe a free-form "what if X
 * happens" scenario, run it against `POST /api/v1/scenarios/generate`, and
 * render the resulting `ScenarioResult` (impact heatmap, evidence grouped
 * by type, interactive causal-chain flow diagram, recommended actions)
 * plus an "add to briefing" workaround (see
 * `ScenarioLabStore.addToBriefing`) and an "arm monitor" action (see
 * `ScenarioLabStore.armMonitor`/`disarmMonitor`).
 *
 * Unauthenticated: `POST /api/v1/scenarios/generate` has no
 * `require_current_user` dependency on the backend (shared/global research,
 * same visibility model as `/api/v1/signals/generate`), so this page isn't
 * wrapped in `authGuard`. `addToBriefing` makes no backend call at all (see
 * its docstring), so there's nothing to gate on auth there either. The
 * arm/disarm monitor endpoints DO require a session, so `AuthStore` (root-
 * scoped, same source of truth the shell header reads) is injected here and
 * `isAuthenticated()` is passed down to `app-scenario-result-view`, which
 * shows a sign-in prompt instead of the action when there's no session —
 * same show/hide-by-auth pattern as the shell header's login/logout switch.
 *
 * `ScenarioLabStore` is app-scoped and reuses cached presets/history on revisit.
 */
@Component({
  selector: 'app-scenarios-page',
  standalone: true,
  imports: [
    FormsModule,
    ActivityFeedComponent,
    ButtonComponent,
    FeaturePageHeaderComponent,
    GuideNotesTabsComponent,
    SkeletonCardComponent,
    EmptyStateComponent,
    PresetPickerComponent,
    ScenarioResultViewComponent,
  ],
  providers: [DatePipe],
  templateUrl: './scenarios-page.component.html',
  styleUrl: './scenarios-page.component.scss',
})
export class ScenariosPageComponent implements OnInit {
  readonly freeTextMaxLength = FREE_TEXT_MAX_LENGTH;
  readonly scenarioNotes = EMPTY_SCENARIO_NOTES;

  readonly guideSteps = computed(() => [
    this.i18n.t('scenarios.guide.step1'),
    this.i18n.t('scenarios.guide.step2'),
    this.i18n.t('scenarios.guide.step3'),
  ]);

  readonly recentScenarioItems = computed<ActivityFeedItem[]>(() =>
    this.store.recentScenarios().map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      meta: this.datePipe.transform(scenario.createdAt, 'short') ?? scenario.createdAt,
      active: this.store.result()?.id === scenario.id,
    })),
  );

  constructor(
    readonly store: ScenarioLabStore,
    readonly auth: AuthStore,
    readonly i18n: TranslationService,
    private readonly datePipe: DatePipe,
  ) {}

  ngOnInit(): void {
    void this.store.init();
  }

  onRetryPresets(): void {
    void this.store.retryPresets();
  }

  onModeChange(mode: ScenarioIntakeMode): void {
    this.store.setMode(mode);
  }

  onSelectPreset(presetId: string): void {
    this.store.selectPreset(presetId);
  }

  onFreeTextChange(text: string): void {
    this.store.setFreeText(text);
  }

  onGenerate(): void {
    void this.store.generate();
  }

  onAddToBriefing(): void {
    void this.store.addToBriefing();
  }

  onArmMonitor(): void {
    void this.store.armMonitor();
  }

  onDisarmMonitor(): void {
    void this.store.disarmMonitor();
  }

  onLoadScenario(scenarioId: string): void {
    void this.store.loadScenarioById(scenarioId);
  }
}
