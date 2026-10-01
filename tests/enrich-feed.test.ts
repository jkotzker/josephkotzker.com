import { describe, expect, it, vi } from 'vitest';
import { fetchLatestEpisode, parseLatestEpisode } from '../src/lib/enrich/feed';

const rssDoc = (items: string) =>
  `<?xml version="1.0"?><rss version="2.0"><channel><title>Show</title>${items}</channel></rss>`;

describe('parseLatestEpisode', () => {
  it('picks the newest item regardless of order', () => {
    const xml = rssDoc(
      `<item><title>Older</title><link>https://x.test/1</link><pubDate>Mon, 01 Sep 2025 10:00:00 GMT</pubDate></item>` +
        `<item><title>Newer</title><link>https://x.test/2</link><pubDate>Wed, 01 Oct 2025 10:00:00 GMT</pubDate></item>`,
    );
    expect(parseLatestEpisode(xml)).toEqual({
      ok: true,
      value: { title: 'Newer', url: 'https://x.test/2', pubDate: '2025-10-01T10:00:00.000Z' },
    });
  });

  it('handles a feed with a single item', () => {
    const xml = rssDoc(`<item><title>Only</title><link>https://x.test/1</link><pubDate>Mon, 01 Sep 2025 10:00:00 GMT</pubDate></item>`);
    expect(parseLatestEpisode(xml)).toMatchObject({ ok: true, value: { title: 'Only' } });
  });

  it('falls back to the enclosure URL when there is no link', () => {
    const xml = rssDoc(
      `<item><title>Audio</title><enclosure url="https://x.test/a.mp3" type="audio/mpeg" length="1"/><pubDate>Mon, 01 Sep 2025 10:00:00 GMT</pubDate></item>`,
    );
    expect(parseLatestEpisode(xml)).toMatchObject({ ok: true, value: { url: 'https://x.test/a.mp3' } });
  });

  it('keeps a numeric-looking title as a string', () => {
    const xml = rssDoc(`<item><title>42</title><link>https://x.test/42</link><pubDate>Mon, 01 Sep 2025 10:00:00 GMT</pubDate></item>`);
    expect(parseLatestEpisode(xml)).toMatchObject({ ok: true, value: { title: '42' } });
  });

  it('reports invalid XML', () => {
    expect(parseLatestEpisode('<rss><channel>')).toMatchObject({ ok: false });
  });

  it('reports a feed with no items', () => {
    expect(parseLatestEpisode(rssDoc(''))).toEqual({ ok: false, reason: 'feed has no items' });
  });

  it('reports items without parseable dates', () => {
    const xml = rssDoc(`<item><title>T</title><link>https://x.test/1</link></item>`);
    expect(parseLatestEpisode(xml)).toEqual({ ok: false, reason: 'no item has a parseable pubDate' });
  });
});

describe('fetchLatestEpisode', () => {
  it('reports a non-2xx status', async () => {
    const fetch = vi.fn(async () => new Response('nope', { status: 500 }));
    expect(await fetchLatestEpisode('https://x.test/feed', { fetch })).toEqual({ ok: false, reason: 'HTTP 500' });
  });

  it('reports a network failure', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('timeout');
    });
    expect(await fetchLatestEpisode('https://x.test/feed', { fetch })).toEqual({ ok: false, reason: 'fetch failed: timeout' });
  });

  it('parses a successful response', async () => {
    const body = rssDoc(`<item><title>Ep</title><link>https://x.test/1</link><pubDate>Mon, 01 Sep 2025 10:00:00 GMT</pubDate></item>`);
    const fetch = vi.fn(async () => new Response(body, { status: 200 }));
    expect(await fetchLatestEpisode('https://x.test/feed', { fetch })).toMatchObject({ ok: true, value: { title: 'Ep' } });
  });
});
