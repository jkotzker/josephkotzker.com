import { mkdirSync, mkdtempSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contactLeaks, verifyDist } from '../scripts/verify-dist.mjs';

const REQUIRED = [
  'index.html', '404.html', 'CNAME', 'rss.xml', 'sitemap-index.xml',
  'blog/index.html', 'projects/index.html', 'podcasts/index.html', 'resume/index.html',
];

function write(root: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, content);
  }
}

function fixture(opts: { dist?: Record<string, string>; posts?: Record<string, string> } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'verify-'));
  const distDir = join(root, 'dist');
  const postsDir = join(root, 'posts');
  mkdirSync(postsDir, { recursive: true });
  const base: Record<string, string> = Object.fromEntries(REQUIRED.map((p) => [p, '<html></html>']));
  base['CNAME'] = 'josephkotzker.com\n';
  base['rss.xml'] = '<rss version="2.0"><channel></channel></rss>';
  write(distDir, { ...base, ...opts.dist });
  write(postsDir, opts.posts ?? {});
  return { distDir, postsDir };
}

const draft = (title: string, eol = '\n') =>
  ['---', `title: ${title}`, 'draft: true', '---', '', 'body', ''].join(eol);

describe('verifyDist', () => {
  it('passes on a clean tree', () => {
    const f = fixture({ posts: { 'a.md': draft('Quiet draft') } });
    expect(verifyDist(f)).toEqual([]);
  });

  it('fails when a CRLF draft title appears in a page', () => {
    const f = fixture({
      posts: { 'a.md': draft('Leaky CRLF draft', '\r\n') },
      dist: { 'blog/index.html': '<h2>Leaky CRLF draft</h2>' },
    });
    expect(verifyDist(f)).toEqual(['draft "Leaky CRLF draft" appears in blog/index.html']);
  });

  it('fails when a BOM-prefixed draft title appears in a page', () => {
    const f = fixture({
      posts: { 'a.md': '﻿' + draft('Leaky BOM draft') },
      dist: { 'index.html': 'Leaky BOM draft' },
    });
    expect(verifyDist(f)).toEqual(['draft "Leaky BOM draft" appears in index.html']);
  });

  it('finds drafts in nested post directories and in the feed', () => {
    const f = fixture({
      posts: { '2026/x.md': draft('Nested draft') },
      dist: { 'rss.xml': '<rss version="2.0"><channel><title>Nested draft</title></channel></rss>' },
    });
    expect(verifyDist(f)).toEqual(['draft "Nested draft" appears in rss.xml']);
  });

  it('matches HTML-escaped titles', () => {
    const f = fixture({
      posts: { 'a.md': draft(`"Tom & Jerry's <guide>"`) },
      dist: { 'blog/x/index.html': '<h1>Tom &amp; Jerry&#39;s &lt;guide&gt;</h1>' },
    });
    expect(verifyDist(f)).toEqual([`draft "Tom & Jerry's <guide>" appears in blog/x/index.html`]);
  });

  it('matches the &#x27; and &apos; apostrophe forms', () => {
    const f = fixture({
      posts: { 'a.md': draft(`"It's secret"`) },
      dist: { 'a/index.html': 'It&#x27;s secret', 'b/index.html': 'It&apos;s secret' },
    });
    expect(verifyDist(f).sort()).toEqual([
      `draft "It's secret" appears in a/index.html`,
      `draft "It's secret" appears in b/index.html`,
    ]);
  });

  it('ignores underscore-prefixed posts, which the collection excludes', () => {
    const f = fixture({
      posts: { '_scratch.md': draft('Excluded draft') },
      dist: { 'index.html': 'Excluded draft' },
    });
    expect(verifyDist(f)).toEqual([]);
  });

  it('fails on a phone-like string in the resume', () => {
    const f = fixture({ dist: { 'resume/index.html': '<p>555-123-4567</p>' } });
    expect(verifyDist(f)).toEqual(['resume/index.html contains a phone-number-like string']);
  });

  it('fails on an email address or mailto link anywhere in the output', () => {
    expect(verifyDist(fixture({ dist: { 'index.html': '<p>write to someone@example.com</p>' } }))).toEqual(['index.html contains an email address']);
    expect(verifyDist(fixture({ dist: { 'blog/index.html': '<a href="mailto:x">Mail</a>' } }))).toEqual(['blog/index.html contains an email address']);
  });

  it('allows an address assembled from data attributes', () => {
    const f = fixture({ dist: { 'index.html': '<a data-mail-user="joseph" data-mail-domain="josephkotzker.com">Email</a><script>a.href = `mailto:${u}@${d}`;</script>' } });
    expect(verifyDist(f)).toEqual([]);
  });

  it('fails on an address-like string in the resume', () => {
    const f = fixture({ dist: { 'resume/index.html': '<p>123 Example Street</p>' } });
    expect(verifyDist(f)).toEqual(['resume/index.html contains a street-address-like string']);
  });

  describe('published résumé PDF', () => {
    const pdf = { 'resume/joseph-kotzker-resume.pdf': '%PDF-1.4' };
    const source = (html: string) => {
      const dir = mkdtempSync(join(tmpdir(), 'pdfsrc-'));
      writeFileSync(join(dir, 'resume-public.html'), html);
      return join(dir, 'resume-public.html');
    };

    it('passes when its source HTML is clean', () => {
      const f = fixture({ dist: pdf });
      expect(verifyDist({ ...f, resumePdfSource: source('<h1>Joseph Kotzker</h1><p>josephkotzker.com</p>') })).toEqual([]);
    });

    it('fails when its source HTML carries a phone number, address or email', () => {
      const f = fixture({ dist: pdf });
      expect(verifyDist({ ...f, resumePdfSource: source('<li>(201) 555-0123</li><li>123 Example Street</li><li>a@b.com</li>') })).toEqual([
        'resume PDF source contains a phone-number-like string',
        'resume PDF source contains a street-address-like string',
        'resume PDF source contains an email address',
      ]);
    });

    it('fails when the PDF is published without a source to check', () => {
      const f = fixture({ dist: pdf });
      expect(verifyDist({ ...f, resumePdfSource: join(tmpdir(), 'does-not-exist.html') })).toEqual([
        'resume PDF is published but its source HTML is missing, so it cannot be checked',
      ]);
    });
  });

  it('fails on a missing required file', () => {
    const f = fixture();
    unlinkSync(join(f.distDir, '404.html'));
    expect(verifyDist(f)).toEqual(['missing 404.html']);
  });

  it('fails on a wrong CNAME', () => {
    const f = fixture({ dist: { CNAME: 'example.com\n' } });
    expect(verifyDist(f)).toEqual(['CNAME is not josephkotzker.com']);
  });

  it('reports unparseable front matter instead of crashing', () => {
    const f = fixture({ posts: { 'bad.md': '---\ntitle: [unclosed\n---\n' } });
    expect(verifyDist(f)).toEqual(['could not parse front matter in bad.md']);
  });
});

describe('contactLeaks', () => {
  const PHONE = ['a phone-number-like string'];
  const ADDRESS = ['a street-address-like string'];

  it.each([
    '555-123-4567', '555.123.4567', '555 123 4567', '(555) 123-4567', '(555)123-4567',
    '5551234567', '+1 555 123 4567', '+15551234567', '1-555-123-4567', 'm. 555-123-4567',
  ])('finds the phone number %s', (phone) => {
    expect(contactLeaks(`<p>${phone}</p>`)).toEqual(PHONE);
  });

  it('finds a phone number split across tags or entities', () => {
    expect(contactLeaks('<p><strong>555</strong>-123-4567</p>')).toEqual(PHONE);
    expect(contactLeaks('<p>555&nbsp;123&nbsp;4567</p>')).toEqual(PHONE);
  });

  it('finds a tel: link', () => {
    expect(contactLeaks('<a href="tel:+15551234567">Call</a>')).toEqual(PHONE);
  });

  it.each([
    '123 Example Street', '31 Lincoln Ave, Apt 1', '4 Main St.', '1600 Pennsylvania Avenue',
    '9 Old Mill Road', 'Apt 4B', 'Suite 200', 'Springfield, NJ 07000', 'Springfield, NJ 07000-1234',
  ])('finds the address fragment %s', (address) => {
    expect(contactLeaks(`<p>${address}</p>`)).toEqual(ADDRESS);
  });

  it.each([
    '2021-04 – present', '2017 – 2022', 'Bachelor of Science, 2017-05', 'ISO 8601 dates',
    'Rutgers University, New Brunswick, NJ', 'Led a team of 12 engineers', 'Cut build times by 40%',
    'S3 E8', 'Unit testing and CI',
  ])('leaves ordinary résumé text alone: %s', (text) => {
    expect(contactLeaks(`<p>${text}</p>`)).toEqual([]);
  });

  it('ignores long numeric ids inside URLs', () => {
    expect(contactLeaks('<a href="https://open.spotify.com/user/1211038582">Spotify</a>')).toEqual([]);
  });
});

