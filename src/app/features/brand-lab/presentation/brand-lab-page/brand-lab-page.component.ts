import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslationKey, TranslationService } from '../../../../core';
import {
  BRAND_GLYPHS,
  MYTH_GLYPHS,
  MidasAgentId,
  MidasGlyphId,
  MIDAS_GLYPH_CATALOG,
  glyphsForAgent,
} from '../../../../shared/midas-glyph/midas-glyph.model';
import { MidasGlyphComponent } from '../../../../shared/midas-glyph/midas-glyph.component';
import { GoldenPolyhedronComponent } from '../../../../shared/golden-polyhedron/golden-polyhedron.component';
import { BrandLabStore } from '../../application/brand-lab-store';

const AGENT_ORDER: MidasAgentId[] = [
  'supervisor',
  'analyst',
  'quant',
  'macro',
  'sentiment',
  'consequence',
  'advisor',
];

const AGENT_LABEL_KEYS: Record<MidasAgentId, TranslationKey> = {
  supervisor: 'chat.agent.supervisor',
  analyst: 'chat.agent.analyst',
  quant: 'chat.agent.quant',
  advisor: 'chat.agent.advisor',
  consequence: 'chat.agent.consequence',
  macro: 'chat.agent.macro',
  sentiment: 'chat.agent.sentiment',
};

@Component({
  selector: 'app-brand-lab-page',
  standalone: true,
  imports: [MidasGlyphComponent, GoldenPolyhedronComponent],
  templateUrl: './brand-lab-page.component.html',
  styleUrl: './brand-lab-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandLabPageComponent {
  readonly i18n = inject(TranslationService);
  readonly store = inject(BrandLabStore);

  readonly brandGlyphs = BRAND_GLYPHS.filter((g) => g.id !== 'brand-midas-sigil');
  readonly mythGlyphs = MYTH_GLYPHS;
  readonly recommendedSigil = MIDAS_GLYPH_CATALOG.find((g) => g.id === 'brand-midas-sigil')!;
  readonly agentOrder = AGENT_ORDER;

  readonly finalistGlyphs = computed(() =>
    MIDAS_GLYPH_CATALOG.filter((g) => this.store.finalists().has(g.id)),
  );

  agentLabel(agent: MidasAgentId): string {
    return this.i18n.t(AGENT_LABEL_KEYS[agent]);
  }

  glyphsForAgent(agent: MidasAgentId) {
    return glyphsForAgent(agent);
  }

  glyphTitle(meta: (typeof MIDAS_GLYPH_CATALOG)[number]): string {
    return this.i18n.locale() === 'en' ? meta.titleEn : meta.titleEs;
  }

  glyphSymbolism(meta: (typeof MIDAS_GLYPH_CATALOG)[number]): string {
    return this.i18n.locale() === 'en' ? meta.symbolismEn : meta.symbolismEs;
  }

  isFinalist(id: MidasGlyphId): boolean {
    return this.store.isFinalist(id);
  }

  toggleFinalist(id: MidasGlyphId): void {
    this.store.toggleFinalist(id);
  }

  clearFinalists(): void {
    this.store.clearFinalists();
  }
}
