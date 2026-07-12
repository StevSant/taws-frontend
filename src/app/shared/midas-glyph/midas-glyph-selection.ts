import { MidasAgentId, MidasGlyphId } from './midas-glyph.model';

/** Logo maestro de Midas (header, login, favicon). */
export const MIDAS_BRAND_GLYPH: MidasGlyphId = 'brand-icosahedron';

/** Un glifo por agente del enjambre — selección acordada en Brand Lab. */
export const MIDAS_AGENT_GLYPHS: Readonly<Record<MidasAgentId, MidasGlyphId>> = {
  supervisor: 'supervisor-orbit',
  analyst: 'analyst-prism',
  quant: 'quant-tetrahedron',
  advisor: 'advisor-scales',
  consequence: 'consequence-chain',
  // Reuse closest existing marks until dedicated glyphs land in Brand Lab.
  macro: 'advisor-compass',
  sentiment: 'analyst-lens',
};

export const MIDAS_GLYPH_SELECTION = {
  brand: MIDAS_BRAND_GLYPH,
  agents: MIDAS_AGENT_GLYPHS,
} as const;

export function midasAgentGlyph(agent: MidasAgentId): MidasGlyphId {
  return MIDAS_AGENT_GLYPHS[agent];
}
