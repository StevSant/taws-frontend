/**
 * Distinct filter values present in the persisted news store, for the browse page's
 * source / provider dropdowns. Mirrors the backend `NewsFacetsResponse`.
 *
 * Read from the corpus rather than hardcoded, so a dropdown can only ever offer a
 * value some article actually carries.
 */
export interface NewsFacets {
  sources: string[];
  providers: string[];
}
