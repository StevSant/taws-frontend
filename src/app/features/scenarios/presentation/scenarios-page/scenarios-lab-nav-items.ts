import { TranslationKey } from '../../../../core';

/**
 * Structural definition for the Scenario Lab's page-owned nav (rendered via
 * `app-feature-nav`, replacing the generic shell sidebar for `/scenarios` —
 * see `CUSTOM_LAYOUT_ROUTE_PREFIXES` in `ShellComponent`). Mirrors
 * `SIDEBAR_ITEMS` in `layout/sidebar/sidebar.component.ts`: labels stay as
 * `TranslationKey`s here and get resolved by the page component (via
 * `i18n.t`) into the plain-string `FeatureNavItem[]` the shared component
 * expects, so the nav re-resolves labels on locale change.
 *
 * "Mis escenarios", "Plantillas", "Variables" and "Historial" have no
 * dedicated destination page yet — this is a nav-shell wiring pass, not new
 * page development, so they route back to the Lab itself (`/scenarios`),
 * which already surfaces presets and recent-scenario history in one page.
 * "Configuración" has no settings page anywhere in the app yet either; it
 * falls back to `/radar`, matching the same fallback `SIDEBAR_ITEMS` already
 * uses for `shell.sidebar.settings`, so the "no settings page" behavior is
 * consistent between the global sidebar and this page-owned nav.
 */
export interface ScenariosLabNavItemDef {
  readonly labelKey: TranslationKey;
  readonly route: string;
  /** Icon key rendered via the `@switch` in `FeatureNavComponent`'s template. */
  readonly icon: string;
  readonly exact?: boolean;
}

export const SCENARIOS_LAB_NAV_ITEMS: readonly ScenariosLabNavItemDef[] = [
  { labelKey: 'scenarios.nav.lab', route: '/scenarios', icon: 'flask-conical', exact: true },
  { labelKey: 'scenarios.nav.myScenarios', route: '/scenarios', icon: 'bookmark' },
  { labelKey: 'scenarios.nav.templates', route: '/scenarios', icon: 'layout-template' },
  { labelKey: 'scenarios.nav.variables', route: '/scenarios', icon: 'sliders-horizontal' },
  { labelKey: 'scenarios.nav.history', route: '/scenarios', icon: 'history' },
  { labelKey: 'shell.nav.briefings', route: '/briefings', icon: 'file-text' },
  { labelKey: 'shell.sidebar.settings', route: '/radar', icon: 'settings' },
];
