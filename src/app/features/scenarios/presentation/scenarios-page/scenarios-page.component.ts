import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../../../core';
import { ButtonComponent, SpinnerComponent } from '../../../../shared';
import { AuthStore } from '../../../auth/application';
import { ScenarioIntakeMode, ScenarioLabStore } from '../../application';
import { ScenarioRepository } from '../../domain';
import { HttpScenarioRepository } from '../../infrastructure';
import { PresetPickerComponent } from '../preset-picker/preset-picker.component';
import { ScenarioResultViewComponent } from '../scenario-result-view/scenario-result-view.component';

const FREE_TEXT_MAX_LENGTH = 1000;

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
 * `ScenarioLabStore`/`ScenarioRepository` are provided here so each
 * navigation to this page gets a fresh instance — same feature-scoped DI
 * pattern as `ChatPageComponent`/`RadarPageComponent`/`BriefingsPageComponent`.
 */
@Component({
  selector: 'app-scenarios-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    SpinnerComponent,
    PresetPickerComponent,
    ScenarioResultViewComponent,
  ],
  providers: [ScenarioLabStore, { provide: ScenarioRepository, useClass: HttpScenarioRepository }],
  templateUrl: './scenarios-page.component.html',
  styleUrl: './scenarios-page.component.scss',
})
export class ScenariosPageComponent implements OnInit {
  readonly freeTextMaxLength = FREE_TEXT_MAX_LENGTH;

  constructor(
    readonly store: ScenarioLabStore,
    readonly auth: AuthStore,
    readonly i18n: TranslationService,
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
}
