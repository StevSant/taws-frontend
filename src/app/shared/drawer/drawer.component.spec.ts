import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DrawerComponent } from './drawer.component';

@Component({
  standalone: true,
  imports: [DrawerComponent],
  template: `
    <app-drawer [open]="isOpen()" ariaLabel="Test drawer" (closed)="closedCount = closedCount + 1">
      <p class="drawer-content">Inside</p>
    </app-drawer>
  `,
})
class HostComponent {
  readonly isOpen = signal(false);
  closedCount = 0;
}

function createHost() {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return fixture;
}

function dialogOf(fixture: ReturnType<typeof createHost>): HTMLDialogElement {
  const dialog = fixture.nativeElement.querySelector('dialog');
  expect(dialog).not.toBeNull();
  return dialog as HTMLDialogElement;
}

describe('DrawerComponent', () => {
  it('stays closed until open is set', () => {
    const fixture = createHost();

    expect(dialogOf(fixture).open).toBe(false);
  });

  it('opens when the open input flips to true', () => {
    const fixture = createHost();

    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();

    expect(dialogOf(fixture).open).toBe(true);
  });

  it('closes when the open input flips back to false', () => {
    const fixture = createHost();
    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();

    fixture.componentInstance.isOpen.set(false);
    fixture.detectChanges();

    expect(dialogOf(fixture).open).toBe(false);
  });

  it('projects its content', () => {
    const fixture = createHost();
    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.drawer-content')?.textContent).toContain('Inside');
  });

  it('emits closed on ESC without closing itself — the owner decides', () => {
    const fixture = createHost();
    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();

    dialogOf(fixture).dispatchEvent(new Event('cancel', { cancelable: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(1);
    // Still open: the store owns the state, so the drawer must not close behind its back.
    expect(dialogOf(fixture).open).toBe(true);
  });

  it('emits closed when the backdrop is clicked', () => {
    const fixture = createHost();
    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();
    const dialog = dialogOf(fixture);

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(1);
  });

  it('does not emit closed when the panel itself is clicked', () => {
    const fixture = createHost();
    fixture.componentInstance.isOpen.set(true);
    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('.drawer__panel')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(0);
  });

  it('exposes its aria-label', () => {
    const fixture = createHost();

    expect(dialogOf(fixture).getAttribute('aria-label')).toBe('Test drawer');
  });
});
