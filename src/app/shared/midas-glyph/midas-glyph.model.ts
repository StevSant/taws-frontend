export type MidasAgentId = 'supervisor' | 'analyst' | 'quant' | 'advisor' | 'consequence';

export type MidasGlyphId =
  | 'brand-midas-sigil'
  | 'brand-oracle-seal'
  | 'brand-icosahedron'
  | 'brand-neural-orb'
  | 'brand-dodecahedron'
  | 'brand-golden-hand'
  | 'brand-midas-touch'
  | 'brand-king-aureole'
  | 'brand-golden-flow'
  | 'supervisor-orbit'
  | 'supervisor-octahedron'
  | 'analyst-prism'
  | 'analyst-lens'
  | 'quant-cube'
  | 'quant-tetrahedron'
  | 'advisor-compass'
  | 'advisor-scales'
  | 'consequence-fork'
  | 'consequence-chain';

export type MidasGlyphCategory = 'brand' | 'myth' | 'agent';

export interface MidasGlyphMeta {
  id: MidasGlyphId;
  category: MidasGlyphCategory;
  agent?: MidasAgentId;
  titleEs: string;
  titleEn: string;
  symbolismEs: string;
  symbolismEn: string;
}

export const MIDAS_GLYPH_CATALOG: readonly MidasGlyphMeta[] = [
  {
    id: 'brand-midas-sigil',
    category: 'brand',
    titleEs: 'Insignia Midas (recomendada)',
    titleEn: 'Midas sigil (recommended)',
    symbolismEs:
      'Fusión mito + producto: mano que ofrece el icosaedro-oráculo. Lee bien en 24px, cuenta la historia y no depende de WebGL.',
    symbolismEn:
      'Myth + product fusion: a hand presenting the oracle icosahedron. Reads at 24px, tells the story, no WebGL required.',
  },
  {
    id: 'brand-oracle-seal',
    category: 'brand',
    titleEs: 'Sello oráculo',
    titleEn: 'Oracle seal',
    symbolismEs:
      'Icosaedro en medallón + rayo del toque. Máxima legibilidad para favicon y app icon.',
    symbolismEn:
      'Icosahedron in a medallion plus touch ray. Maximum legibility for favicon and app icon.',
  },
  {
    id: 'brand-icosahedron',
    category: 'brand',
    titleEs: 'Icosaedro Midas',
    titleEn: 'Midas icosahedron',
    symbolismEs:
      'El poliedro del chat: 20 caras, equilibrio y complejidad. Ideal como marca viva y hero 3D.',
    symbolismEn:
      'The chat polyhedron: 20 faces, balance and complexity. Strong as a living brand mark and 3D hero.',
  },
  {
    id: 'brand-neural-orb',
    category: 'brand',
    titleEs: 'Orbe neural (actual)',
    titleEn: 'Neural orb (current)',
    symbolismEs: 'Logo actual del header: núcleo + red de 5 nodos. Lectura rápida a tamaño pequeño.',
    symbolismEn: 'Current header logo: core plus a 5-node mesh. Reads clearly at small sizes.',
  },
  {
    id: 'brand-dodecahedron',
    category: 'brand',
    titleEs: 'Dodecaedro dorado',
    titleEn: 'Golden dodecahedron',
    symbolismEs: 'Símbolo clásico de plenitud y valor. Más “emblema” que “interfaz”.',
    symbolismEn: 'Classic symbol of wholeness and value. More emblem than UI widget.',
  },
  {
    id: 'brand-golden-hand',
    category: 'myth',
    titleEs: 'Mano del toque',
    titleEn: 'Touch hand',
    symbolismEs:
      'El gesto del mito: lo que toca se vuelve oro. Ideal como favicon o sello de “insight valioso”.',
    symbolismEn:
      'The myth’s gesture: whatever it touches turns to gold. Strong as a favicon or “valuable insight” seal.',
  },
  {
    id: 'brand-midas-touch',
    category: 'myth',
    titleEs: 'Toque transmutador',
    titleEn: 'Transmuting touch',
    symbolismEs:
      'Dato crudo → señal dorada: la mano convierte ruido de mercado en inteligencia accionable.',
    symbolismEn:
      'Raw data → golden signal: the hand turns market noise into actionable intelligence.',
  },
  {
    id: 'brand-king-aureole',
    category: 'myth',
    titleEs: 'Aureola real',
    titleEn: 'Royal aureole',
    symbolismEs:
      'Rey Midas y el peso del deseo: corona geométrica — poder, juicio y también hubris.',
    symbolismEn:
      'King Midas and the weight of desire: a geometric crown — power, judgment, and hubris.',
  },
  {
    id: 'brand-golden-flow',
    category: 'myth',
    titleEs: 'Río áureo',
    titleEn: 'Golden river',
    symbolismEs:
      'El Pactolo: lavar la maldición. Flujo que purifica — útil para “reset” o modo demo.',
    symbolismEn:
      'The Pactolus: washing away the curse. A purifying flow — useful for “reset” or demo mode.',
  },
  {
    id: 'supervisor-orbit',
    category: 'agent',
    agent: 'supervisor',
    titleEs: 'Órbita central',
    titleEn: 'Central orbit',
    symbolismEs: 'Enruta consultas: un núcleo y satélites en órbita. El director del enjambre.',
    symbolismEn: 'Routes queries: one core with orbiting satellites. The swarm director.',
  },
  {
    id: 'supervisor-octahedron',
    category: 'agent',
    agent: 'supervisor',
    titleEs: 'Octaedro puente',
    titleEn: 'Bridge octahedron',
    symbolismEs: 'Dos pirámides unidas: conecta especialistas y mantiene coherencia del flujo.',
    symbolismEn: 'Two joined pyramids: bridges specialists and keeps the flow coherent.',
  },
  {
    id: 'analyst-prism',
    category: 'agent',
    agent: 'analyst',
    titleEs: 'Prisma analítico',
    titleEn: 'Analytic prism',
    symbolismEs: 'Descompone noticias en señales: luz entrante, facetas de impacto.',
    symbolismEn: 'Splits news into signals: incoming light, facets of impact.',
  },
  {
    id: 'analyst-lens',
    category: 'agent',
    agent: 'analyst',
    titleEs: 'Lente de radar',
    titleEn: 'Radar lens',
    symbolismEs: 'Enfoca titulares relevantes y filtra ruido del mercado.',
    symbolismEn: 'Focuses relevant headlines and filters market noise.',
  },
  {
    id: 'quant-cube',
    category: 'agent',
    agent: 'quant',
    titleEs: 'Cubo latice',
    titleEn: 'Lattice cube',
    symbolismEs: 'Modelos, series y volatilidad en una estructura medible y precisa.',
    symbolismEn: 'Models, time series, and volatility in a measurable, precise structure.',
  },
  {
    id: 'quant-tetrahedron',
    category: 'agent',
    agent: 'quant',
    titleEs: 'Tetraedro métrico',
    titleEn: 'Metric tetrahedron',
    symbolismEs: 'La forma más estable en 3D: base cuantitativa sobre la que se apoya el juicio.',
    symbolismEn: 'The most stable 3D form: the quantitative base judgment rests on.',
  },
  {
    id: 'advisor-compass',
    category: 'agent',
    agent: 'advisor',
    titleEs: 'Brújula hexagonal',
    titleEn: 'Hex compass',
    symbolismEs: 'Orientación para el usuario: contexto macro y narrativa comprensible.',
    symbolismEn: 'Orientation for the user: macro context and understandable narrative.',
  },
  {
    id: 'advisor-scales',
    category: 'agent',
    agent: 'advisor',
    titleEs: 'Balanza de escenarios',
    titleEn: 'Scenario scales',
    symbolismEs: 'Pesa trade-offs y riesgo sin ejecutar órdenes: juicio humano en el loop.',
    symbolismEn: 'Weighs trade-offs and risk without placing orders: human judgment in the loop.',
  },
  {
    id: 'consequence-fork',
    category: 'agent',
    agent: 'consequence',
    titleEs: 'Bifurcación causal',
    titleEn: 'Causal fork',
    symbolismEs: 'Un evento, varios caminos: escenarios “qué pasa si”.',
    symbolismEn: 'One event, many paths: “what if” scenario branching.',
  },
  {
    id: 'consequence-chain',
    category: 'agent',
    agent: 'consequence',
    titleEs: 'Cadena de nodos',
    titleEn: 'Node chain',
    symbolismEs: 'Eslabones causa → efecto enlazados, como el grafo de escenarios.',
    symbolismEn: 'Linked cause → effect steps, like the scenario graph.',
  },
];

export const BRAND_GLYPHS = MIDAS_GLYPH_CATALOG.filter((g) => g.category === 'brand');

export const MYTH_GLYPHS = MIDAS_GLYPH_CATALOG.filter((g) => g.category === 'myth');

export const AGENT_GLYPHS = MIDAS_GLYPH_CATALOG.filter((g) => g.category === 'agent');

export function glyphsForAgent(agent: MidasAgentId): MidasGlyphMeta[] {
  return MIDAS_GLYPH_CATALOG.filter((g) => g.agent === agent);
}
