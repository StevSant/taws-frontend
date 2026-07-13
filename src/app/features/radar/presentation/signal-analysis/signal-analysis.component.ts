import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { ButtonComponent } from '../../../../shared';

/** The three facets of a signal's analysis, one per tab, in reading order. */
type AnalysisTab = 'thesis' | 'drivers' | 'risks';

/**
 * Reusable read-only view of a signal's AI analysis (issue #40): thesis, key
 * drivers, and risk factors — or an explicit "análisis no disponible" state
 * when the classification fell back to an uncertain/zero-confidence call
 * (`analysisAvailable === false`). Never renders an empty thesis as if it were
 * a real judgment.
 *
 * The three facets are shown as a WAI-ARIA tablist rather than one long stacked
 * column, so a dense thesis paragraph plus two bullet lists reads as three
 * skimmable panels instead of a wall of text. Only facets with real content get
 * a tab (matching the previous layout, which hid empty sections), so the tablist
 * always has at least one tab whenever `hasContent()` is true.
 *
 * The unavailable state can offer a way out (issue #21). A signal is routinely
 * *classified* (e.g. positive @ 80% confidence) yet carries no thesis/drivers/risks,
 * and the user was left staring at "Análisis no disponible" with no action — a dead
 * end. Hosts that can re-run the Analyst pipeline opt in with `canRegenerate` and
 * handle `regenerate`; hosts that can't (the news detail page) leave it off and see
 * the state exactly as before.
 *
 * Pure presentation: it receives the already-mapped analysis fields as inputs
 * and holds no state beyond the active tab, so it can be mounted both inside the
 * compact radar card (expandable) and on the per-news detail page (issue #38).
 */
@Component({
  selector: 'app-signal-analysis',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './signal-analysis.component.html',
  styleUrl: './signal-analysis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalAnalysisComponent {
  readonly thesis = input<string>();
  readonly keyDrivers = input<string[]>([]);
  readonly riskFactors = input<string[]>([]);
  /** `false` ⇒ classification fell back to uncertain/zero-confidence. */
  readonly analysisAvailable = input(false);
  /** Opt in to the "Regenerar análisis" action in the unavailable state (issue #21). */
  readonly canRegenerate = input(false);
  /** Drives the action's disabled state + in-progress label while the pipeline runs. */
  readonly isRegenerating = input(false);
  /** Message from a failed regenerate attempt, shown next to the action that caused it. */
  readonly regenerateError = input<string | null>(null);

  readonly regenerate = output<void>();

  readonly i18n = inject(TranslationService);

  /** Per-instance id root so two cards on one page don't collide on tab/panel ids. */
  private static instanceCount = 0;
  private readonly uid = `signal-analysis-${SignalAnalysisComponent.instanceCount++}`;

  /** i18n key for each tab's label — reuses the existing section-title keys. */
  private readonly labelKeys: Record<AnalysisTab, TranslationKey> = {
    thesis: 'radar.analysis.thesis',
    drivers: 'radar.analysis.drivers',
    risks: 'radar.analysis.risks',
  };

  /** The tab the user last picked; the effective `activeTab()` falls back off it. */
  private readonly requestedTab = signal<AnalysisTab>('thesis');

  readonly hasThesis = computed(() => !!this.thesis()?.trim());

  /** True when there is genuine analysis to show (real classification + some content). */
  readonly hasContent = computed(
    () =>
      this.analysisAvailable() &&
      (this.hasThesis() || this.keyDrivers().length > 0 || this.riskFactors().length > 0),
  );

  /** Facets that actually have content, in reading order — empty ones get no tab. */
  readonly availableTabs = computed<AnalysisTab[]>(() => {
    const tabs: AnalysisTab[] = [];
    if (this.hasThesis()) {
      tabs.push('thesis');
    }
    if (this.keyDrivers().length > 0) {
      tabs.push('drivers');
    }
    if (this.riskFactors().length > 0) {
      tabs.push('risks');
    }
    return tabs;
  });

  /** The requested tab if it still has content, else the first available facet. */
  readonly activeTab = computed<AnalysisTab>(() => {
    const tabs = this.availableTabs();
    const requested = this.requestedTab();
    return tabs.includes(requested) ? requested : (tabs[0] ?? 'thesis');
  });

  tabLabelKey(tab: AnalysisTab): TranslationKey {
    return this.labelKeys[tab];
  }

  /** Item count for the list facets (shown in the tab); `null` for the thesis. */
  tabCount(tab: AnalysisTab): number | null {
    if (tab === 'drivers') {
      return this.keyDrivers().length;
    }
    if (tab === 'risks') {
      return this.riskFactors().length;
    }
    return null;
  }

  tabId(tab: AnalysisTab): string {
    return `${this.uid}-tab-${tab}`;
  }

  panelId(tab: AnalysisTab): string {
    return `${this.uid}-panel-${tab}`;
  }

  select(tab: AnalysisTab): void {
    this.requestedTab.set(tab);
  }

  /** Roving-tabindex keyboard nav: Arrow keys wrap, Home/End jump to the ends. */
  onTablistKeydown(event: KeyboardEvent): void {
    const tabs = this.availableTabs();
    if (tabs.length === 0) {
      return;
    }

    const currentIndex = Math.max(0, tabs.indexOf(this.activeTab()));
    let targetIndex: number;
    switch (event.key) {
      case 'ArrowRight':
        targetIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.requestedTab.set(tabs[targetIndex]);
    // Buttons render in `availableTabs()` order, so the index maps 1:1. Programmatic
    // focus works even while the target still carries tabindex="-1" (it flips to 0
    // on the next change detection).
    const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
    buttons.item(targetIndex)?.focus();
  }

  onRegenerate(): void {
    this.regenerate.emit();
  }
}
