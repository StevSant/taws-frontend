import { Component, EventEmitter, Input, Output } from '@angular/core';

/**
 * Minimal reusable button. Emits `pressed` instead of exposing a raw click
 * event so callers don't couple to DOM event shape.
 */
@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  @Input() label = '';
  @Input() disabled = false;
  @Output() pressed = new EventEmitter<void>();

  onClick(): void {
    if (!this.disabled) {
      this.pressed.emit();
    }
  }
}
