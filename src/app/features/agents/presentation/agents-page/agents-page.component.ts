import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslationService } from '../../../../core';
import { MidasGlyphComponent, midasAgentGlyph } from '../../../../shared';
import { ShellSearchService } from '../../../../layout/shell/shell-search.service';
import { AGENT_CATALOG, AgentProfile } from '../../domain/agent-catalog';

@Component({
  selector: 'app-agents-page',
  standalone: true,
  imports: [MidasGlyphComponent],
  templateUrl: './agents-page.component.html',
  styleUrl: './agents-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentsPageComponent {
  readonly i18n = inject(TranslationService);
  private readonly shellSearch = inject(ShellSearchService);

  readonly agents = AGENT_CATALOG;

  glyphFor(agent: AgentProfile) {
    return midasAgentGlyph(agent.id);
  }

  kindLabel(agent: AgentProfile): string {
    return agent.kind === 'router'
      ? this.i18n.t('agents.kind.router')
      : this.i18n.t('agents.kind.specialist');
  }

  ask(agent: AgentProfile): void {
    void this.shellSearch.openChatWithDraft(this.i18n.t(agent.exampleKey));
  }
}
