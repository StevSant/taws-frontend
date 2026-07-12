import { Directive, ElementRef, HostListener, inject } from '@angular/core';

/** Pixels-per-second reveal speed; keeps long and short overflows feeling uniform. */
const MARQUEE_SPEED_PX_PER_SEC = 55;
/** Ignore sub-pixel rounding so titles that just fit never jitter. */
const OVERFLOW_EPSILON = 2;

/**
 * On hover/focus, slides an overflowing text element horizontally to reveal the
 * full content, then eases back on leave. Does nothing when the text fits, so
 * short names never jitter (issue #53 acceptance criteria). Apply to the
 * sliding text element; its parent must clip (`overflow: hidden`).
 */
@Directive({
  selector: '[appMarqueeOnHover]',
  standalone: true,
})
export class MarqueeOnHoverDirective {
  private readonly host = inject(ElementRef<HTMLElement>);

  @HostListener('mouseenter')
  @HostListener('focus')
  onEnter(): void {
    const el = this.host.nativeElement;
    const parent = el.parentElement;
    if (!parent) {
      return;
    }

    const overflow = el.scrollWidth - parent.clientWidth;
    if (overflow <= OVERFLOW_EPSILON) {
      return;
    }

    const durationSec = overflow / MARQUEE_SPEED_PX_PER_SEC;
    el.style.transition = `transform ${durationSec.toFixed(2)}s linear`;
    el.style.transform = `translateX(-${overflow}px)`;
  }

  @HostListener('mouseleave')
  @HostListener('blur')
  onLeave(): void {
    const el = this.host.nativeElement;
    el.style.transition = 'transform 0.2s ease';
    el.style.transform = 'translateX(0)';
  }
}
