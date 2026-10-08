import { marked } from 'marked';

/**
 * Inline Markdown (links, emphasis) for short curated descriptions in src/data/*.yaml. The YAML is
 * authored in this repo, so raw HTML in it is trusted and passed through.
 */
export function inlineMarkdown(text: string): string {
  return marked.parseInline(text, { async: false });
}
