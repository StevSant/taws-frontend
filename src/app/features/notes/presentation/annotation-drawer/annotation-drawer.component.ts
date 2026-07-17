import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslationService } from '../../../../core';
import { DrawerComponent } from '../../../../shared';
import { AnnotationDrawerStore } from '../../application';
import { NotesPanelComponent } from '../notes-panel/notes-panel.component';

/**
 * The one annotation surface, mounted once in the shell for the whole app.
 *
 * This is what stops the add-note form from being copy-pasted onto every page: pages do
 * not own a form, they declare a target and call `AnnotationDrawerStore.open(...)`. A
 * fourth annotatable page costs one line here and nothing else.
 */
@Component({
  selector: 'app-annotation-drawer',
  standalone: true,
  imports: [DrawerComponent, NotesPanelComponent],
  templateUrl: './annotation-drawer.component.html',
  styleUrl: './annotation-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationDrawerComponent {
  readonly drawer = inject(AnnotationDrawerStore);
  readonly i18n = inject(TranslationService);
}
