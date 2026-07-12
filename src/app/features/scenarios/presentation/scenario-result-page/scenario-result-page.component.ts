import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { TranslationService } from '../../../../core';
import {
  ActivityFeedComponent,
  ActivityFeedItem,
  ButtonComponent,
  EmptyStateComponent,
  SkeletonCardComponent,
  SpinnerComponent,
} from '../../../../shared';
import { AuthStore } from '../../../auth/application';
import { ScenarioLabStore } from '../../application';
import { ScenarioResultViewComponent } from '../scenario-result-view/scenario-result-view.component';

/**
 * Dedicated scenario result page at `/scenarios/:id`. Loads a persisted
 * `ScenarioResult` by id so recent-history clicks and post-generate redirects
 * land on a focused results view instead of scrolling the composer page.
 */
@Component({
  selector: 'app-scenario-result-page',
  standalone: true,
  imports: [
    RouterLink,
    ActivityFeedComponent,
    ButtonComponent,
    EmptyStateComponent,
    SkeletonCardComponent,
    SpinnerComponent,
    ScenarioResultViewComponent,
  ],
  providers: [DatePipe],
  templateUrl: './scenario-result-page.component.html',
  styleUrl: './scenario-result-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScenarioResultPageComponent implements OnInit {
  readonly store = inject(ScenarioLabStore);
  readonly auth = inject(AuthStore);
  readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly recentScenarioItems = computed<ActivityFeedItem[]>(() => {
    const activeId = this.store.result()?.id;
    return this.store.recentScenarios().map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      meta: this.datePipe.transform(scenario.createdAt, 'short') ?? scenario.createdAt,
      active: scenario.id === activeId,
    }));
  });

  ngOnInit(): void {
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    await this.store.init();
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((id) => {
        if (id) {
          void this.loadScenario(id);
        }
      });
  }

  private async loadScenario(id: string): Promise<void> {
    await this.store.loadScenarioById(id);
    this.cdr.markForCheck();
  }

  onLoadScenario(scenarioId: string): void {
    void this.router.navigate(['/scenarios', scenarioId]);
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

  onRetry(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      void this.loadScenario(id);
    }
  }
}
