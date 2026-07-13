import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

/**
 * UI pacing for the staged pipeline reveal (issue #21). These are presentation
 * cadence, not backend telemetry: a scenario run is a single blocking POST with
 * no per-step progress events, so the pipeline advances on this schedule while
 * the request is in flight and then holds on the final step until the real
 * response arrives — it never shows "all done" ahead of the backend.
 *
 * Each entry is how long the step at that index stays `active` before handing
 * off to the next one. There is one fewer entry than there are steps: the last
 * step has no duration because it waits for the response.
 */
const STAGE_DURATIONS_MS = [2200, 3200, 4500] as const;

type ScenarioPipelineStepState = 'pending' | 'active' | 'done' | 'error';

interface ScenarioPipelineStepView {
  readonly label: string;
  readonly state: ScenarioPipelineStepState;
}

/**
 * Sequential progress pipeline shown while a scenario is running. Renders the
 * known agent stages as a connected vertical pipeline whose steps move through
 * `pending -> active -> done`, driven by a timer while `isRunning` is true. The
 * final step stays `active` until the request resolves; if it fails, the step
 * the pipeline is on flips to `error` and the timer stops. Reduced-motion users
 * still get the state/colour changes, just without the pulse animations (see
 * the component SCSS).
 */
@Component({
  selector: 'app-scenario-progress-pipeline',
  standalone: true,
  templateUrl: './scenario-progress-pipeline.component.html',
  styleUrl: './scenario-progress-pipeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioProgressPipelineComponent {
  /** Ordered stage labels, already localized by the caller. */
  readonly labels = input.required<readonly string[]>();
  /** Whether the scenario request is still in flight. */
  readonly isRunning = input.required<boolean>();
  /** Non-null once the run has failed; freezes the pipeline on the current step. */
  readonly errorMessage = input<string | null>(null);

  /** Index of the step the pipeline is currently working through. */
  private readonly activeIndex = signal(0);

  private readonly destroyRef = inject(DestroyRef);
  private timerId: ReturnType<typeof setTimeout> | null = null;

  readonly steps = computed<ScenarioPipelineStepView[]>(() => {
    const active = this.activeIndex();
    const failed = this.errorMessage() !== null;
    const running = this.isRunning();
    return this.labels().map((label, index) => ({
      label,
      state: this.stepStateAt(index, active, failed, running),
    }));
  });

  constructor() {
    // Kick the staged reveal when the request starts; freeze it the moment the
    // run errors or finishes. The timer work runs untracked so advancing
    // `activeIndex` never re-triggers this effect (which would restart it).
    effect(() => {
      const running = this.isRunning();
      const failed = this.errorMessage() !== null;
      untracked(() => {
        if (running && !failed) {
          this.start();
        } else {
          this.stop();
        }
      });
    });
    this.destroyRef.onDestroy(() => this.stop());
  }

  private stepStateAt(
    index: number,
    active: number,
    failed: boolean,
    running: boolean,
  ): ScenarioPipelineStepState {
    if (index < active) {
      return 'done';
    }
    if (index > active) {
      return 'pending';
    }
    if (failed) {
      return 'error';
    }
    return running ? 'active' : 'done';
  }

  private start(): void {
    this.stop();
    this.activeIndex.set(0);
    this.scheduleNext();
  }

  private scheduleNext(): void {
    const current = this.activeIndex();
    const lastIndex = this.labels().length - 1;
    if (current >= lastIndex) {
      // Hold on the final step until the real response arrives.
      return;
    }
    const duration = STAGE_DURATIONS_MS[Math.min(current, STAGE_DURATIONS_MS.length - 1)];
    this.timerId = setTimeout(() => {
      this.activeIndex.update((value) => value + 1);
      this.scheduleNext();
    }, duration);
  }

  private stop(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}
