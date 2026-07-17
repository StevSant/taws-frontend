import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * A generic right-side drawer. Knows nothing about what it contains.
 *
 * Built on a native `<dialog>`, opened with `showModal()` where the runtime supports it —
 * giving the top layer, the backdrop, ESC-to-close, focus trapping and an inert background
 * natively, the same idiom `voice-mode-overlay` uses. Unlike that one (mounted and unmounted
 * by its parent), this drawer is driven by `[open]`, so an effect syncs the DOM to the input.
 *
 * jsdom (this project's test environment, at least as of jsdom 28) does not implement
 * `HTMLDialogElement.showModal()`. Rather than leave the drawer untested, `showDialog` /
 * `hideDialog` feature-detect `showModal`/`close` and fall back to toggling the `open`
 * property directly, and `onKeydown` falls back to a hand-rolled Tab trap copied from
 * `voice-mode-overlay`'s `trapTab` for exactly that case — real browsers still get the
 * fully native modal behavior.
 *
 * The drawer never closes itself: ESC and backdrop clicks emit `closed` and nothing more.
 * Whoever owns the `[open]` state decides, so the DOM can never drift from the store.
 */
@Component({
  selector: 'app-drawer',
  standalone: true,
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerComponent {
  readonly open = input.required<boolean>();
  readonly ariaLabel = input<string>('');
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.open()) {
        if (!element.open) {
          this.showDialog(element);
        }
      } else if (element.open) {
        this.hideDialog(element);
      }
    });
  }

  onCancel(event: Event): void {
    // Block the native close so the DOM cannot get ahead of the owner's state.
    event.preventDefault();
    this.closed.emit();
  }

  onClick(event: MouseEvent): void {
    // A click landing on the dialog element itself is a click on its ::backdrop —
    // anything inside the panel targets the panel or its children instead.
    if (event.target === this.dialog().nativeElement) {
      this.closed.emit();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    // showModal() traps Tab natively; without it (see class doc) the trap is manual.
    if (typeof this.dialog().nativeElement.showModal !== 'function' && event.key === 'Tab') {
      this.trapTab(event);
    }
  }

  private showDialog(element: HTMLDialogElement): void {
    if (typeof element.showModal === 'function') {
      element.showModal();
      return;
    }
    element.open = true;
  }

  private hideDialog(element: HTMLDialogElement): void {
    if (typeof element.close === 'function') {
      element.close();
      return;
    }
    element.open = false;
  }

  /**
   * Keeps Tab / Shift+Tab focus cycling within the dialog when the native modal focus
   * trap isn't available. Wraps at both ends and pulls focus back in if it ever lands
   * outside the dialog's focusable set. Mirrors `voice-mode-overlay`'s `trapTab`.
   */
  private trapTab(event: KeyboardEvent): void {
    const focusable = this.focusableElements();
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = active !== null && focusable.includes(active);

    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(): HTMLElement[] {
    const root = this.dialog().nativeElement;
    const selector =
      'button:not([tabindex="-1"]):not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    return Array.from(root.querySelectorAll<HTMLElement>(selector));
  }
}
