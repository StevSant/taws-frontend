/** Tab order for main shell navigation — used for directional route transitions. */
const SHELL_TAB_PREFIXES = ['/radar', '/chat', '/agents', '/scenarios', '/briefings', '/brand-lab'] as const;

export type ShellRouteTransition = 'forward' | 'back' | 'neutral';

export function getShellTabIndex(url: string): number | null {
  const path = url.split('?')[0].split('#')[0];

  for (let i = 0; i < SHELL_TAB_PREFIXES.length; i++) {
    if (path === SHELL_TAB_PREFIXES[i] || path.startsWith(`${SHELL_TAB_PREFIXES[i]}/`)) {
      return i;
    }
  }

  return null;
}

export function getShellRouteTransition(fromUrl: string, toUrl: string): ShellRouteTransition {
  const from = getShellTabIndex(fromUrl);
  const to = getShellTabIndex(toUrl);

  if (from === null || to === null || from === to) {
    return 'neutral';
  }

  return to > from ? 'forward' : 'back';
}
