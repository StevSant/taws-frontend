import { TranslationKey } from '../../../../core';
import { FeatureNavItem } from '../../../../shared';

/**
 * Definition for one `<app-feature-nav>` item: a translation key instead of
 * a resolved label, so `resolveBriefingsNavItems` can re-resolve it whenever
 * the active locale changes (mirrors `SidebarComponent`'s `SIDEBAR_ITEMS`
 * array, which keeps `labelKey` unresolved for the same reason).
 */
export interface BriefingsNavItemDef {
  readonly icon: string;
  readonly labelKey: TranslationKey;
  readonly route: string;
  readonly exact?: boolean;
}

/**
 * The 8 nav-shell items for the Briefings page's own `<app-feature-nav>`
 * sidebar (nav-shell exercise, not new page development — see task scope).
 * Real routes are used where a feature page already exists; everything else
 * falls back to the closest existing equivalent, mirroring
 * `SidebarComponent`'s existing fallback convention
 * (e.g. `shell.sidebar.alerts` -> `/briefings`, `shell.sidebar.settings` ->
 * `/radar`) rather than inventing new pages:
 *
 * - Inicio      -> /radar      (real — `''` redirects to `radar`, the app's landing route)
 * - Watchlists  -> /watchlists (real — dedicated management page, issue #17)
 * - Briefings   -> /briefings  (real — this page itself, exact match)
 * - Escenarios  -> /scenarios  (real)
 * - Variables   -> /radar      (fallback — macro context lives in `RadarMacroCardsComponent`; no dedicated route)
 * - Historial   -> /briefings  (fallback — review history lives in this page's history panel; no dedicated route)
 * - Alertas     -> /briefings  (fallback, mirrors `shell.sidebar.alerts` -> `/briefings`)
 * - Configuración -> /radar    (fallback, mirrors `shell.sidebar.settings` -> `/radar`)
 */
export const BRIEFINGS_NAV_ITEM_DEFS: readonly BriefingsNavItemDef[] = [
  { icon: 'home', labelKey: 'briefings.nav.home', route: '/radar' },
  { icon: 'star', labelKey: 'shell.sidebar.watchlists', route: '/watchlists' },
  { icon: 'file-text', labelKey: 'shell.nav.briefings', route: '/briefings', exact: true },
  { icon: 'flask-conical', labelKey: 'shell.nav.scenarios', route: '/scenarios' },
  { icon: 'sliders-horizontal', labelKey: 'briefings.nav.variables', route: '/radar' },
  { icon: 'history', labelKey: 'briefings.nav.history', route: '/briefings' },
  { icon: 'bell', labelKey: 'shell.sidebar.alerts', route: '/briefings' },
  { icon: 'settings', labelKey: 'shell.sidebar.settings', route: '/radar' },
];

/** Resolves every item's `labelKey` into a display string via `translate`. */
export function resolveBriefingsNavItems(
  translate: (key: TranslationKey) => string,
): FeatureNavItem[] {
  return BRIEFINGS_NAV_ITEM_DEFS.map((def) => ({
    icon: def.icon,
    label: translate(def.labelKey),
    route: def.route,
    exact: def.exact,
  }));
}
