/**
 * Triggers a browser download of `blob` as `filename` via a transient
 * `<a download>` anchor + object URL — the standard client-side download
 * pattern (no existing utility for this in the codebase yet). The anchor is
 * appended to the DOM before the click (some browsers, notably Firefox,
 * ignore `.click()` on a detached element) and the object URL is revoked on
 * the next tick, after the browser has had a chance to start the download.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
