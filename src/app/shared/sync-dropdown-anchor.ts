export interface DropdownAnchor {
  top: number;
  left: number;
}

export function syncDropdownAnchor(host: HTMLElement, gapPx = 8): DropdownAnchor {
  const rect = host.getBoundingClientRect();
  return {
    top: rect.bottom + gapPx,
    left: rect.left + rect.width / 2,
  };
}
