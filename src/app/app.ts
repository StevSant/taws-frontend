import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component. Kept intentionally empty — the ShellComponent (routed via
 * app.routes.ts) owns the actual layout/header.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
