import { Component, Input } from '@angular/core';

/**
 * Minimal loading indicator used while a streaming response is in flight.
 */
@Component({
  selector: 'app-spinner',
  standalone: true,
  templateUrl: './spinner.component.html',
  styleUrl: './spinner.component.scss',
})
export class SpinnerComponent {
  @Input() label = 'Loading…';
}
