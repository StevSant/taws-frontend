import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core';

@Component({
  selector: 'app-radar-add-instrument-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './radar-add-instrument-card.component.html',
  styleUrl: './radar-add-instrument-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarAddInstrumentCardComponent {
  constructor(readonly i18n: TranslationService) {}
}
