import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslationService } from '../../../../core';
import { ScenarioPreset } from '../../domain';

/**
 * Preset picker: renders the curated "what-if" scenarios
 * (`GET /api/v1/scenarios/presets`) as selectable cards. Purely
 * presentational — `ScenarioLabPageComponent` owns the actual selection via
 * `ScenarioLabStore`.
 */
@Component({
  selector: 'app-preset-picker',
  standalone: true,
  templateUrl: './preset-picker.component.html',
  styleUrl: './preset-picker.component.scss',
})
export class PresetPickerComponent {
  @Input({ required: true }) presets: ScenarioPreset[] = [];
  @Input() selectedId: string | null = null;
  @Output() select = new EventEmitter<string>();

  constructor(readonly i18n: TranslationService) {}

  title(preset: ScenarioPreset): string {
    return this.i18n.locale() === 'en' ? preset.titleEn : preset.titleEs;
  }

  description(preset: ScenarioPreset): string {
    return this.i18n.locale() === 'en' ? preset.descriptionEn : preset.descriptionEs;
  }

  onSelect(preset: ScenarioPreset): void {
    this.select.emit(preset.id);
  }
}
