import { Injectable, computed, signal } from '@angular/core';
import { ScenarioPreset, ScenarioRepository, ScenarioResult } from '../domain';
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
@Injectable()
export class ScenarioLabStore {
  private readonly presetsSignal = signal<ScenarioPreset[]>([]);
  private readonly isLoadingPresetsSignal = signal(false);
  private readonly presetsErrorSignal = signal<string | null>(null);

  private readonly modeSignal = signal<ScenarioIntakeMode>('preset');
  private readonly selectedPresetIdSignal = signal<string | null>(null);
  private readonly freeTextSignal = signal('');

  private readonly resultSignal = signal<ScenarioResult | null>(null);
  private readonly isGeneratingSignal = signal(false);
  private readonly generateErrorSignal = signal<string | null>(null);

  private readonly briefingActionStatusSignal = signal<BriefingActionStatus>('idle');

  readonly presets = this.presetsSignal.asReadonly();
  readonly isLoadingPresets = this.isLoadingPresetsSignal.asReadonly();
  readonly presetsError = this.presetsErrorSignal.asReadonly();

  readonly mode = this.modeSignal.asReadonly();
  readonly selectedPresetId = this.selectedPresetIdSignal.asReadonly();
  readonly freeText = this.freeTextSignal.asReadonly();

  readonly result = this.resultSignal.asReadonly();
  readonly isGenerating = this.isGeneratingSignal.asReadonly();
  readonly generateError = this.generateErrorSignal.asReadonly();

  readonly briefingActionStatus = this.briefingActionStatusSignal.asReadonly();

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
    await this.loadPresets();
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
  async generate(): Promise<void> {
    if (!this.canGenerate()) {
      return;
    }

    this.isGeneratingSignal.set(true);
    this.generateErrorSignal.set(null);
    this.briefingActionStatusSignal.set('idle');
    try {
      const result = await this.scenarioRepository.generateScenario(
        this.modeSignal() === 'preset'
          ? { presetId: this.selectedPresetIdSignal() ?? undefined }
          : { freeText: this.freeTextSignal().trim() },
      );
      this.resultSignal.set(result);
    } catch (error: unknown) {
      this.generateErrorSignal.set(this.toErrorMessage(error));
      this.resultSignal.set(null);
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

  private async loadPresets(): Promise<void> {
    this.isLoadingPresetsSignal.set(true);
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
