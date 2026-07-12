import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-user-profile-chip',
  standalone: true,
  templateUrl: './user-profile-chip.component.html',
  styleUrl: './user-profile-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileChipComponent {
  readonly initial = input.required<string>();
  readonly email = input.required<string>();
  readonly roleLabel = input.required<string>();
}
