import { describe, expect, it, vi } from 'vitest';
import { fetchEpisodes, parseEpisodes, splitTitle } from '../src/lib/enrich/feed';

const rssDoc = (items: string) =>
  `<?xml version="1.0"?><rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel><title>Show</title>${items}</channel></rss>`;

const item = (title: string, n: number, extra = '') =>
  `<item><title>${title}</title><link>https://x.test/${n}</link><pubDate>Mon, ${String(n).padStart(2, '0')} Sep 2025 10:00:00 GMT</pubDate>${extra}</item>`;

describe('parseEpisodes', () => {
  it('returns the newest episodes first, regardless of feed order', () => {
    const xml = rssDoc(item('Older', 1) + item('Newer', 2));
    expect(parseEpisodes(xml)).toEqual({
      ok: true,
      value: [
        { title: 'Newer', url: 'https://x.test/2', pubDate: '2025-09-02T10:00:00.000Z' },
        { title: 'Older', url: 'https://x.test/1', pubDate: '2025-09-01T10:00:00.000Z' },
      ],
    });
  });

  it('keeps only the newest `count` episodes', () => {
    const xml = rssDoc([1, 2, 3, 4, 5, 6, 7, 8].map((n) => item(`E${n}`, n)).join(''));
    const result = parseEpisodes(xml, 3);
    expect(result.ok && result.value.map((e) => e.title)).toEqual(['E8', 'E7', 'E6']);
  });

  it('defaults to six episodes', () => {
    const xml = rssDoc([1, 2, 3, 4, 5, 6, 7, 8].map((n) => item(`E${n}`, n)).join(''));
    const result = parseEpisodes(xml);
    expect(result.ok && result.value).toHaveLength(6);
  });

  it('returns fewer episodes when the feed has fewer', () => {
    const result = parseEpisodes(rssDoc(item('Only', 1)));
    expect(result.ok && result.value).toHaveLength(1);
  });

  it('takes season and episode from a title prefix, over itunes:season', () => {
    const xml = rssDoc(item('S3E8. The Fast and the Furious - A Kiss', 1, '<itunes:season>9</itunes:season>'));
    expect(parseEpisodes(xml)).toMatchObject({
      ok: true,
      value: [{ title: 'The Fast and the Furious — A Kiss', season: 3, episode: 8 }],
    });
  });

  it('falls back to itunes:season and itunes:episode when the title has no prefix', () => {
    const xml = rssDoc(item('Plain', 1, '<itunes:season>2</itunes:season><itunes:episode>5</itunes:episode>'));
    expect(parseEpisodes(xml)).toMatchObject({ ok: true, value: [{ title: 'Plain', season: 2, episode: 5 }] });
  });

  it('leaves the episode number unset for an unnumbered episode', () => {
    const xml = rssDoc(item('Special 2 - The Brazillian Job', 1, '<itunes:season>2</itunes:season>'));
    const result = parseEpisodes(xml);
    expect(result).toMatchObject({ ok: true, value: [{ title: 'Special 2 — The Brazillian Job', season: 2 }] });
    expect(result.ok && result.value[0].episode).toBeUndefined();
  });

  it('decodes entities in titles', () => {
    const result = parseEpisodes(rssDoc(item('S3E3. Days of Thunder &amp; Donnie Brasco - We Used to Make Movies', 1)));
    expect(result.ok && result.value[0].title).toBe('Days of Thunder & Donnie Brasco — We Used to Make Movies');
  });

  it('falls back to the enclosure URL when there is no link', () => {
    const xml = rssDoc(
      `<item><title>Audio</title><enclosure url="https://x.test/a.mp3" type="audio/mpeg" length="1"/><pubDate>Mon, 01 Sep 2025 10:00:00 GMT</pubDate></item>`,
    );
    expect(parseEpisodes(xml)).toMatchObject({ ok: true, value: [{ url: 'https://x.test/a.mp3' }] });
  });

  it('keeps a numeric-looking title as a string', () => {
    expect(parseEpisodes(rssDoc(item('42', 1)))).toMatchObject({ ok: true, value: [{ title: '42' }] });
  });

  it('skips items without a parseable date, title or link', () => {
    const xml = rssDoc(`<item><title>No date</title><link>https://x.test/9</link></item>` + item('Good', 1));
    const result = parseEpisodes(xml);
    expect(result.ok && result.value.map((e) => e.title)).toEqual(['Good']);
  });

  it('reports invalid XML', () => {
    expect(parseEpisodes('<rss><channel>')).toMatchObject({ ok: false });
  });

  it('reports a feed with no items', () => {
    expect(parseEpisodes(rssDoc(''))).toEqual({ ok: false, reason: 'feed has no items' });
  });

  it('reports a feed with no usable items', () => {
    const xml = rssDoc(`<item><title>T</title><link>https://x.test/1</link></item>`);
    expect(parseEpisodes(xml)).toEqual({ ok: false, reason: 'no item has a title, link and parseable pubDate' });
  });
});

describe('splitTitle', () => {
  it('leaves a hyphen without spaces alone', () => {
    expect(splitTitle('S1E2. Spider-Man')).toEqual({ title: 'Spider-Man', season: 1, episode: 2 });
  });

  it('does not treat a mid-title S1E2 as a prefix', () => {
    expect(splitTitle('About S1E2.')).toEqual({ title: 'About S1E2.' });
  });
});

describe('fetchEpisodes', () => {
  it('reports a non-2xx status', async () => {
    const fetch = vi.fn(async () => new Response('nope', { status: 500 }));
    expect(await fetchEpisodes('https://x.test/feed', { fetch })).toEqual({ ok: false, reason: 'HTTP 500' });
  });

  it('reports a network failure', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('timeout');
    });
    expect(await fetchEpisodes('https://x.test/feed', { fetch })).toEqual({ ok: false, reason: 'fetch failed: timeout' });
  });

  it('reports a body read failure', async () => {
    const fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => { throw new Error('reset'); } } as unknown as Response));
    expect(await fetchEpisodes('https://x.test/feed', { fetch })).toEqual({ ok: false, reason: 'fetch failed: reset' });
  });

  it('parses a successful response and passes the count through', async () => {
    const body = rssDoc(item('A', 1) + item('B', 2));
    const fetch = vi.fn(async () => new Response(body, { status: 200 }));
    expect(await fetchEpisodes('https://x.test/feed', { fetch, count: 1 })).toMatchObject({ ok: true, value: [{ title: 'B' }] });
  });
});
