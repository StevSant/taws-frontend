import { Injectable, signal } from '@angular/core';
import { MidasGlyphId } from '../../../shared/midas-glyph/midas-glyph.model';

const STORAGE_KEY = 'taws-brand-lab-finalists';

@Injectable({ providedIn: 'root' })
export class BrandLabStore {
  readonly finalists = signal<ReadonlySet<MidasGlyphId>>(this.read());

  isFinalist(id: MidasGlyphId): boolean {
    return this.finalists().has(id);
  }

  toggleFinalist(id: MidasGlyphId): void {
    const next = new Set(this.finalists());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.finalists.set(next);
    this.persist(next);
  }

  clearFinalists(): void {
    this.finalists.set(new Set());
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private read(): Set<MidasGlyphId> {
    if (typeof localStorage === 'undefined') {
      return new Set();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return new Set();
      }
      const parsed = JSON.parse(raw) as MidasGlyphId[];
      return new Set(parsed);
    } catch {
      return new Set();
    }
  }

  private persist(ids: Set<MidasGlyphId>): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }
}
