import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import { MidasGlyphComponent } from '../../../../shared';
import { MidasGlyphId } from '../../../../shared/midas-glyph/midas-glyph.model';
import { BoardroomAgent, formatToolName, resolveAgentGlyph } from '../../domain';

/** Maps a backend route/agent name to its i18n display-label key (mirrors RoutingTrace). */
const AGENT_LABEL_KEYS: Record<string, TranslationKey> = {
  supervisor: 'chat.agent.supervisor',
  analyst: 'chat.agent.analyst',
  quant: 'chat.agent.quant',
  advisor: 'chat.agent.advisor',
  consequence: 'chat.agent.consequence',
  macro: 'chat.agent.macro',
  sentiment: 'chat.agent.sentiment',
};

/**
 * "Boardroom" view of a multi-agent turn: one card per specialist the supervisor
 * fanned out to, lighting up together as they consult, use tools, and finish.
 *
 * Fed by `buildBoardroom` (see `BoardroomAgent`), which drops the supervisor and
 * flags the advisor-labelled fan-in step as the synthesizer. Each card shows the
 * agent's glyph, its localized label, and a live status line (`consulting…` /
 * `using <Tool>` / `done`, or `synthesizing…` for the synthesizer). Renders
 * nothing until at least one specialist appears; the page decides when to show it
 * (only for the latest turn with >=2 distinct specialists).
 */
@Component({
  selector: 'app-boardroom',
  standalone: true,
  imports: [MidasGlyphComponent],
  template: `
    @if (agents.length > 0) {
      <div class="boardroom glass" role="status" [attr.aria-label]="i18n.t('boardroom.title')">
        <span class="boardroom__title">{{ i18n.t('boardroom.title') }}</span>
        <ul class="boardroom__grid">
          @for (agent of agents; track agent.agent) {
            <li
              class="boardroom__card"
              [class.boardroom__card--active]="isLive(agent)"
              [class.boardroom__card--tool]="agent.status === 'using-tool'"
              [class.boardroom__card--done]="agent.status === 'done'"
              [class.boardroom__card--synthesizer]="agent.isSynthesizer"
            >
              @if (glyphFor(agent.agent); as glyph) {
                <app-midas-glyph
                  class="boardroom__glyph"
                  [glyph]="glyph"
                  [size]="28"
                  [animated]="isLive(agent)"
                />
              }
              <span class="boardroom__name">{{ agentLabel(agent) }}</span>
              <span class="boardroom__status">{{ statusLabel(agent) }}</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .boardroom {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-lg);
        border: 1px solid var(--color-border);
        background: var(--glass-bg);
      }

      .boardroom__title {
        font-family: var(--font-family-mono);
        font-size: 0.65rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--color-text-muted);
      }

      .boardroom__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
        gap: var(--space-2);
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .boardroom__card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-1);
        text-align: center;
        padding: var(--space-2);
        border-radius: var(--radius-sm);
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        transition:
          background-color 0.2s ease,
          border-color 0.2s ease,
          opacity 0.2s ease;
        /* Cards deal themselves onto the table as the room convenes. */
        animation: boardroom-card-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
      }

      /* Staggered enter — mirrors the app's feature-stagger cadence (~0.05s apart). */
      .boardroom__card:nth-child(2) {
        animation-delay: 0.05s;
      }
      .boardroom__card:nth-child(3) {
        animation-delay: 0.1s;
      }
      .boardroom__card:nth-child(4) {
        animation-delay: 0.15s;
      }
      .boardroom__card:nth-child(5) {
        animation-delay: 0.2s;
      }
      .boardroom__card:nth-child(6) {
        animation-delay: 0.25s;
      }
      .boardroom__card:nth-child(n + 7) {
        animation-delay: 0.3s;
      }

      .boardroom__card--active {
        background: var(--color-gold-dim-bg);
        border-color: var(--color-gold-border);
      }

      /* Gentle "working" breath while a specialist consults or runs a tool. */
      .boardroom__card--active::after {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: inherit;
        pointer-events: none;
        z-index: 0;
        box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-gold) 32%, transparent);
        animation: boardroom-working 1.8s ease-in-out infinite;
      }

      .boardroom__card--synthesizer {
        border-color: var(--color-gold);
      }

      /* Synthesizer fan-in gets a slow gold sheen sweeping across while it works. */
      .boardroom__card--synthesizer:not(.boardroom__card--done)::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        z-index: 0;
        opacity: 0.5;
        background: linear-gradient(
          100deg,
          transparent 30%,
          color-mix(in srgb, var(--color-gold-bright) 22%, transparent) 50%,
          transparent 70%
        );
        background-size: 220% 100%;
        animation: boardroom-shimmer 2.4s linear infinite;
      }

      .boardroom__card--done {
        opacity: 0.75;
      }

      /* Settle: the glyph clicks into place once the specialist finishes. */
      .boardroom__card--done .boardroom__glyph {
        animation: boardroom-settle 0.4s ease-out both;
      }

      /* Checkmark badge on the resolved status line. */
      .boardroom__card--done .boardroom__status::before {
        content: '✓ ';
        font-weight: 700;
      }

      .boardroom__glyph {
        display: inline-flex;
        position: relative;
        z-index: 1;
      }

      .boardroom__name {
        position: relative;
        z-index: 1;
        font-family: var(--font-family-mono);
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .boardroom__status {
        position: relative;
        z-index: 1;
        font-family: var(--font-family-mono);
        font-size: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-muted);
      }

      .boardroom__card--active .boardroom__status {
        color: var(--color-gold);
      }

      .boardroom__card--done .boardroom__status {
        color: var(--color-gain);
      }

      html[data-theme='light'] .boardroom {
        background: var(--color-surface);
        border-color: var(--color-gold-border);
      }

      @keyframes boardroom-card-in {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes boardroom-working {
        0%,
        100% {
          box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-gold) 30%, transparent);
        }
        50% {
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-gold) 8%, transparent);
        }
      }

      @keyframes boardroom-shimmer {
        from {
          background-position: 160% 0;
        }
        to {
          background-position: -60% 0;
        }
      }

      @keyframes boardroom-settle {
        0% {
          transform: scale(1.12);
        }
        60% {
          transform: scale(0.97);
        }
        100% {
          transform: scale(1);
        }
      }

      /* Reduced motion: keep every resolved state (colour, checkmark, glow ring)
         but drop the looping/entrance motion — mirrors the rest of the app. */
      @media (prefers-reduced-motion: reduce) {
        .boardroom__card,
        .boardroom__card--done .boardroom__glyph {
          animation: none;
        }

        .boardroom__card--active::after,
        .boardroom__card--synthesizer:not(.boardroom__card--done)::before {
          animation: none;
        }

        .boardroom__card--synthesizer:not(.boardroom__card--done)::before {
          opacity: 0.32;
          background-position: 50% 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardroomComponent {
  @Input() agents: BoardroomAgent[] = [];

  readonly i18n = inject(TranslationService);

  glyphFor(agent: string): MidasGlyphId | null {
    return resolveAgentGlyph(agent);
  }

  /** A card is "live" while its specialist is consulting or running a tool. */
  isLive(agent: BoardroomAgent): boolean {
    return agent.status === 'consulting' || agent.status === 'using-tool';
  }

  agentLabel(agent: BoardroomAgent): string {
    if (agent.isSynthesizer) {
      return this.i18n.t('boardroom.synthesizer');
    }
    const key = AGENT_LABEL_KEYS[agent.agent];
    return key ? this.i18n.t(key) : agent.agent;
  }

  statusLabel(agent: BoardroomAgent): string {
    if (agent.status === 'done') {
      return this.i18n.t('boardroom.status.done');
    }
    if (agent.isSynthesizer) {
      return this.i18n.t('boardroom.status.synthesizing');
    }
    if (agent.status === 'using-tool' && agent.activeTool) {
      return `${this.i18n.t('boardroom.status.usingTool')} ${formatToolName(agent.activeTool)}`;
    }
    return this.i18n.t('boardroom.status.consulting');
  }
}
