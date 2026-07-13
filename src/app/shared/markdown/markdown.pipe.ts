import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

/** Charts are rendered via `message.charts` / `<taws-chart>` — not Markdown images. */
function stripMarkdownImages(value: string): string {
  return value.replace(/!\[[^\]]*]\([^)]*\)/g, '').replace(/<img\b[^>]*>/gi, '');
}

/**
 * Renders assistant/user Markdown (bold, lists, code, etc.) as sanitized HTML
 * when bound with `[innerHTML]`.
 */
@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value?.trim()) {
      return '';
    }

    return marked.parse(stripMarkdownImages(value), { async: false });
  }
}
