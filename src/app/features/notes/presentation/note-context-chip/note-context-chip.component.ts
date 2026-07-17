import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../../../core';
import { TranslationKey } from '../../../../core/i18n/translation-dict.model';
import { NoteTarget, NoteTargetKind } from '../../domain';
import { noteTargetLink } from '../note-target-link';

const KIND_LABEL_KEY: Record<NoteTargetKind, TranslationKey> = {
  briefing: 'notes.target.briefing',
  scenario: 'notes.target.scenario',
  instrument: 'notes.target.instrument',
};

/**
 * What a note is about, shown next to the note. Three states, all honest:
 * a link when the target is alive, inert text plus "no longer available" once it is
 * deleted, and "unlinked" when there was never a target.
 */
@Component({
  selector: 'app-note-context-chip',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './note-context-chip.component.html',
  styleUrl: './note-context-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteContextChipComponent {
  readonly target = input.required<NoteTarget | null>();
  readonly i18n = inject(TranslationService);

  readonly link = computed(() => {
    const target = this.target();
    return target ? noteTargetLink(target) : null;
  });

  readonly kindLabel = computed(() => {
    const target = this.target();
    return target ? this.i18n.t(KIND_LABEL_KEY[target.kind]) : '';
  });
}
