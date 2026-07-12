import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

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

    return marked.parse(value, { async: false });
  }
}
