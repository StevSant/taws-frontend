import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Application-wide layout: header + routed content. Routed as the root
 * component in app.routes.ts so every page renders inside it.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {}
