import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findBrokenLinks } from '../scripts/check-links.mjs';

function site(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'dist-'));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

describe('findBrokenLinks', () => {
  it('reports only internal links whose target is missing', async () => {
    const root = site({
      'index.html':
        '<a href="/about/">a</a><a href="/missing/">m</a><a href="https://x.test/">x</a>' +
        '<a href="//cdn.test/x.js">c</a><a href="/rss.xml">r</a><a href="/about/#top">h</a>' +
        '<a href="mailto:a@b.test">e</a><img src="/img/logo.svg">',
      'about/index.html': '<a href="/">home</a>',
      'rss.xml': '<rss/>',
      'img/logo.svg': '<svg/>',
    });
    expect(await findBrokenLinks(root)).toEqual([{ file: 'index.html', href: '/missing/' }]);
  });

  it('resolves extensionless paths to a directory index', async () => {
    const root = site({ 'index.html': '<a href="/blog">b</a>', 'blog/index.html': '' });
    expect(await findBrokenLinks(root)).toEqual([]);
  });
});
