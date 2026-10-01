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

  it('reports a broken single-quoted href', async () => {
    const root = site({ 'index.html': "<a href='/gone/'>g</a>" });
    expect(await findBrokenLinks(root)).toEqual([{ file: 'index.html', href: '/gone/' }]);
  });

  it('reports a broken srcset candidate, in either quote style', async () => {
    const root = site({
      'index.html':
        '<img srcset="/img/a.png 1x, /img/missing.png 2x">' +
        "<img srcset='/img/a.png 480w,/img/gone.png 800w'>",
      'img/a.png': '',
    });
    expect(await findBrokenLinks(root)).toEqual([
      { file: 'index.html', href: '/img/missing.png' },
      { file: 'index.html', href: '/img/gone.png' },
    ]);
  });

  it('checks own-origin absolute links and ignores other origins', async () => {
    const root = site({
      'index.html':
        '<a href="https://josephkotzker.com/missing/">a</a>' +
        '<a href="http://josephkotzker.com/also-missing">b</a>' +
        '<a href="https://josephkotzker.com/about/">ok</a>' +
        '<a href="https://example.test/missing/">x</a>' +
        '<a href="tel:+15551234567">t</a><a href="data:text/plain,hi">d</a><a href="#top">f</a>',
      'about/index.html': '',
    });
    expect(await findBrokenLinks(root)).toEqual([
      { file: 'index.html', href: 'https://josephkotzker.com/missing/' },
      { file: 'index.html', href: 'http://josephkotzker.com/also-missing' },
    ]);
  });

  it('does not treat a directory without index.html as a target', async () => {
    const root = site({ 'index.html': '<a href="/blog">b</a><a href="/blog/">c</a>', 'blog/post.html': '' });
    expect(await findBrokenLinks(root)).toEqual([
      { file: 'index.html', href: '/blog' },
      { file: 'index.html', href: '/blog/' },
    ]);
  });

  it('reports malformed percent-encoding instead of throwing', async () => {
    const root = site({ 'index.html': '<a href="/%zz">z</a>' });
    expect(await findBrokenLinks(root)).toEqual([
      { file: 'index.html', href: '/%zz', reason: 'malformed percent-encoding' },
    ]);
  });

  it('rejects with a clear error when the dist directory is missing', async () => {
    const missing = join(tmpdir(), 'dist-does-not-exist-' + Date.now());
    await expect(findBrokenLinks(missing)).rejects.toThrow(/dist directory not found/);
  });

  it('does not let a link climb out of the site root', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'dist-parent-'));
    writeFileSync(join(parent, 'package.json'), '{}');
    const root = join(parent, 'dist');
    mkdirSync(root);
    writeFileSync(join(root, 'index.html'), '<a href="/../package.json">p</a>');
    expect(await findBrokenLinks(root)).toEqual([
      { file: 'index.html', href: '/../package.json', reason: 'path escapes the site root' },
    ]);
  });
});
