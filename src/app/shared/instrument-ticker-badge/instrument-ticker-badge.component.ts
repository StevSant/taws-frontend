import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { instrumentLogoPath } from '../instrument-logo';

interface TickerBrand {
  background: string;
  color: string;
  label: string;
}

const TICKER_BRANDS: Record<string, TickerBrand> = {
  NVDA: { background: '#76b900', color: '#ffffff', label: 'N' },
  AAPL: { background: '#1d1d1f', color: '#ffffff', label: '' },
  TSLA: { background: '#cc0000', color: '#ffffff', label: 'T' },
  BTC: { background: '#f7931a', color: '#ffffff', label: '₿' },
  ETH: { background: '#627eea', color: '#ffffff', label: 'Ξ' },
  LQD: { background: '#1e3a5f', color: '#ffffff', label: 'L' },
  TLT: { background: '#0f766e', color: '#ffffff', label: 'T' },
  MSFT: { background: '#0078d4', color: '#ffffff', label: 'M' },
  GOOGL: { background: '#4285f4', color: '#ffffff', label: 'G' },
  AMZN: { background: '#ff9900', color: '#111111', label: 'a' },
};

const FALLBACK_PALETTE = [
  { background: '#c8920e', color: '#fffdf8' },
  { background: '#334155', color: '#f8fafc' },
  { background: '#0f766e', color: '#ecfdf5' },
  { background: '#7c3aed', color: '#faf5ff' },
];

@Component({
  selector: 'app-instrument-ticker-badge',
  standalone: true,
  templateUrl: './instrument-ticker-badge.component.html',
  styleUrl: './instrument-ticker-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstrumentTickerBadgeComponent {
  @Input({ required: true }) symbol = '';
  @Input() size: 'sm' | 'md' = 'md';

  logoPath(): string | null {
    return instrumentLogoPath(this.symbol);
  }

  brand(): TickerBrand {
    const known = TICKER_BRANDS[this.symbol.toUpperCase()];
    if (known) {
      return known;
    }

    const palette = FALLBACK_PALETTE[this.symbol.length % FALLBACK_PALETTE.length];
    return {
      ...palette,
      label: this.symbol.slice(0, 2).toUpperCase(),
    };
  }
}
