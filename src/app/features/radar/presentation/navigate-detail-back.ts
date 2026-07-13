import { Location } from '@angular/common';
import { Router } from '@angular/router';

/**
 * Detail pages use browser history when possible so "back" returns to wherever the user
 * came from (radar home, markets explorer, news list, etc.). Falls back to the section
 * default when there is no prior history (direct link / new tab).
 */
export function navigateDetailBack(
  router: Router,
  location: Location,
  fallbackUrl: string,
  event?: MouseEvent,
): void {
  if (
    event &&
    (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
  ) {
    return;
  }

  event?.preventDefault();

  if (window.history.length > 1) {
    location.back();
    return;
  }

  void router.navigateByUrl(fallbackUrl);
}
