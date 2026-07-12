import { Injectable, computed, signal } from '@angular/core';
import { ScenarioMonitor, ScenarioPreset, ScenarioRepository, ScenarioResult } from '../domain';
import { formatScenarioForBriefing } from './format-scenario-for-briefing';

/** Which intake path is active: a curated preset, or free-form text. */
export type ScenarioIntakeMode = 'preset' | 'freeform';

/** Outcome of the last "add to briefing" attempt, for inline UI feedback. */
export type BriefingActionStatus = 'idle' | 'copied' | 'error';

/**
 * Signal-based state + facade for the Scenario Lab feature. Presentation
 * components read `presets`/`mode`/`result`/`isGenerating`/etc. and call the
 * `setMode`/`selectPreset`/`setFreeText`/`generate`/`addToBriefing` intents;
 * they never touch `ScenarioRepository` directly.
 */
@Injectable({ providedIn: 'root' })
export class ScenarioLabStore {
  private readonly presetsSignal = signal<ScenarioPreset[]>([]);
  private readonly isLoadingPresetsSignal = signal(false);
  private readonly presetsErrorSignal = signal<string | null>(null);

  private readonly modeSignal = signal<ScenarioIntakeMode>('freeform');
  private readonly selectedPresetIdSignal = signal<string | null>(null);
  private readonly freeTextSignal = signal('');

  private readonly resultSignal = signal<ScenarioResult | null>(null);
  private readonly isGeneratingSignal = signal(false);
  private readonly generateErrorSignal = signal<string | null>(null);
  private readonly isLoadingResultSignal = signal(false);
  private readonly isResultNotFoundSignal = signal(false);
  private readonly resultLoadErrorSignal = signal<string | null>(null);

  private readonly briefingActionStatusSignal = signal<BriefingActionStatus>('idle');

  private readonly monitorSignal = signal<ScenarioMonitor | null>(null);
  private readonly isArmingMonitorSignal = signal(false);
  private readonly monitorErrorSignal = signal<string | null>(null);
  private readonly recentScenariosSignal = signal<ScenarioResult[]>([]);
  private readonly isLoadingRecentSignal = signal(false);
  private sessionReady = false;

  readonly presets = this.presetsSignal.asReadonly();
  readonly isLoadingPresets = this.isLoadingPresetsSignal.asReadonly();
  readonly presetsError = this.presetsErrorSignal.asReadonly();

  readonly mode = this.modeSignal.asReadonly();
  readonly selectedPresetId = this.selectedPresetIdSignal.asReadonly();
  readonly freeText = this.freeTextSignal.asReadonly();

  readonly result = this.resultSignal.asReadonly();
  readonly isGenerating = this.isGeneratingSignal.asReadonly();
  readonly generateError = this.generateErrorSignal.asReadonly();
  readonly isLoadingResult = this.isLoadingResultSignal.asReadonly();
  readonly isResultNotFound = this.isResultNotFoundSignal.asReadonly();
  readonly resultLoadError = this.resultLoadErrorSignal.asReadonly();

  readonly briefingActionStatus = this.briefingActionStatusSignal.asReadonly();

  readonly monitor = this.monitorSignal.asReadonly();
  readonly isArmingMonitor = this.isArmingMonitorSignal.asReadonly();
  readonly monitorError = this.monitorErrorSignal.asReadonly();

  readonly recentScenarios = this.recentScenariosSignal.asReadonly();
  readonly isLoadingRecent = this.isLoadingRecentSignal.asReadonly();

  readonly selectedPreset = computed<ScenarioPreset | null>(
    () =>
      this.presetsSignal().find((preset) => preset.id === this.selectedPresetIdSignal()) ?? null,
  );

  readonly canGenerate = computed(() => {
    if (this.isGeneratingSignal()) {
      return false;
    }
    return this.modeSignal() === 'preset'
      ? this.selectedPresetIdSignal() !== null
      : this.freeTextSignal().trim().length > 0;
  });

  constructor(private readonly scenarioRepository: ScenarioRepository) {}

  /** Loads the curated preset list (once, on page entry). */
  async init(): Promise<void> {
    if (this.sessionReady && this.presetsSignal().length > 0) {
      void this.loadPresets({ background: true });
      void this.loadRecentScenarios({ background: true });
      return;
    }

    await Promise.all([this.loadPresets(), this.loadRecentScenarios()]);
    this.sessionReady = true;
  }

  async retryPresets(): Promise<void> {
    await this.loadPresets();
  }

  setMode(mode: ScenarioIntakeMode): void {
    if (this.modeSignal() === mode) {
      return;
    }
    this.modeSignal.set(mode);
  }

  selectPreset(presetId: string): void {
    this.selectedPresetIdSignal.set(presetId);
  }

  setFreeText(text: string): void {
    this.freeTextSignal.set(text);
  }

  /** Runs the Scenario Simulation graph for the active intake mode (preset or free text). */
  async generate(): Promise<ScenarioResult | null> {
    if (!this.canGenerate()) {
      return null;
    }

    this.isGeneratingSignal.set(true);
    this.generateErrorSignal.set(null);
    this.briefingActionStatusSignal.set('idle');
    this.monitorSignal.set(null);
    this.monitorErrorSignal.set(null);
    try {
      const result = await this.scenarioRepository.generateScenario(
        this.modeSignal() === 'preset'
          ? { presetId: this.selectedPresetIdSignal() ?? undefined }
          : { freeText: this.freeTextSignal().trim() },
      );
      this.resultSignal.set(result);
      await this.loadRecentScenarios();
      return result;
    } catch (error: unknown) {
      this.generateErrorSignal.set(this.toErrorMessage(error));
      this.resultSignal.set(null);
      return null;
    } finally {
      this.isGeneratingSignal.set(false);
    }
  }

  /**
   * "Add to briefing" workaround: the backend's briefing pipeline
   * (`POST /api/v1/watchlists/{id}/briefings`) only generates briefings from
   * a watchlist's own signals — it has no field or endpoint that accepts an
   * existing `ScenarioResult`. Rather than faking a network call that would
   * silently do nothing, this copies a formatted scenario summary to the
   * clipboard so the user can paste it manually when reviewing a briefing.
   * No backend request is made, so there is nothing to gate on auth here.
   */
  async addToBriefing(): Promise<void> {
    const result = this.resultSignal();
    if (!result) {
      return;
    }
    try {
      await navigator.clipboard.writeText(formatScenarioForBriefing(result));
      this.briefingActionStatusSignal.set('copied');
    } catch {
      this.briefingActionStatusSignal.set('error');
    }
  }

  /**
   * "Arm monitor" action (issue #18/#34): turns the current `ScenarioResult`
   * into a standing Watchdog rule. Authenticated — the caller (presentation)
   * is responsible for gating this on `AuthStore.isAuthenticated()`, since
   * the store itself has no session awareness (same separation as every
   * other feature store in this app).
   */
  async armMonitor(): Promise<void> {
    const result = this.resultSignal();
    if (!result || this.isArmingMonitorSignal()) {
      return;
    }
    this.isArmingMonitorSignal.set(true);
    this.monitorErrorSignal.set(null);
    try {
      const monitor = await this.scenarioRepository.armMonitor(result.id);
      this.monitorSignal.set(monitor);
    } catch (error: unknown) {
      this.monitorErrorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isArmingMonitorSignal.set(false);
    }
  }

  /** Disarms the monitor for the current `ScenarioResult`, if one is armed. */
  async disarmMonitor(): Promise<void> {
    const result = this.resultSignal();
    if (!result || this.isArmingMonitorSignal()) {
      return;
    }
    this.isArmingMonitorSignal.set(true);
    this.monitorErrorSignal.set(null);
    try {
      await this.scenarioRepository.disarmMonitor(result.id);
      this.monitorSignal.set(null);
    } catch (error: unknown) {
      this.monitorErrorSignal.set(this.toErrorMessage(error));
    } finally {
      this.isArmingMonitorSignal.set(false);
    }
  }

  async loadScenarioById(scenarioId: string): Promise<void> {
    this.isLoadingResultSignal.set(true);
    this.isResultNotFoundSignal.set(false);
    this.resultLoadErrorSignal.set(null);
    this.briefingActionStatusSignal.set('idle');

    const cached = this.recentScenariosSignal().find((scenario) => scenario.id === scenarioId);
    if (cached) {
      this.resultSignal.set(cached);
    }

    try {
      const result = await this.scenarioRepository.getScenario(scenarioId);
      if (result === null) {
        this.isResultNotFoundSignal.set(true);
        if (!cached) {
          this.resultSignal.set(null);
        }
        return;
      }
      this.resultSignal.set(result);
      this.monitorSignal.set(null);
      this.monitorErrorSignal.set(null);
    } catch (error: unknown) {
      this.resultLoadErrorSignal.set(this.toErrorMessage(error));
      if (!cached) {
        this.resultSignal.set(null);
      }
    } finally {
      this.isLoadingResultSignal.set(false);
    }
  }

  private async loadRecentScenarios(options?: { background?: boolean }): Promise<void> {
    const background = options?.background ?? false;
    if (!background && this.recentScenariosSignal().length === 0) {
      this.isLoadingRecentSignal.set(true);
    }
    try {
      const scenarios = await this.scenarioRepository.listRecentScenarios();
      this.recentScenariosSignal.set(scenarios);
    } catch {
      this.recentScenariosSignal.set([]);
    } finally {
      this.isLoadingRecentSignal.set(false);
    }
  }

  private async loadPresets(options?: { background?: boolean }): Promise<void> {
    const background = options?.background ?? false;
    if (!background && this.presetsSignal().length === 0) {
      this.isLoadingPresetsSignal.set(true);
    }
    this.presetsErrorSignal.set(null);
    try {
      const presets = await this.scenarioRepository.fetchPresets();
      this.presetsSignal.set(presets);
    } catch (error: unknown) {
      this.presetsErrorSignal.set(this.toErrorMessage(error));
      this.presetsSignal.set([]);
    } finally {
      this.isLoadingPresetsSignal.set(false);
    }
  }

  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error while running the scenario';
  }
}
