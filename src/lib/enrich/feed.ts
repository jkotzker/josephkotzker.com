import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { errorMessage, type FetchFn, type Result } from '../result';

export type Episode = { title: string; url: string; pubDate: string };

const TIMEOUT_MS = 10_000;

export async function fetchLatestEpisode(feedUrl: string, opts: { fetch?: FetchFn } = {}): Promise<Result<Episode>> {
  const doFetch = opts.fetch ?? fetch;
  let res: Response;
  try {
    res = await doFetch(feedUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    return { ok: false, reason: `fetch failed: ${errorMessage(e)}` };
  }
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
  let xml: string;
  try {
    xml = await res.text();
  } catch (e) {
    return { ok: false, reason: `fetch failed: ${errorMessage(e)}` };
  }
  return parseLatestEpisode(xml);
}

export function parseLatestEpisode(xml: string): Result<Episode> {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) return { ok: false, reason: `invalid XML: ${valid.err.msg}` };

  const doc = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml);
  const raw = doc?.rss?.channel?.item;
  const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (items.length === 0) return { ok: false, reason: 'feed has no items' };

  const dated = items
    .map((item) => ({ item, time: Date.parse(String(item.pubDate ?? '')) }))
    .filter((d) => !Number.isNaN(d.time))
    .sort((a, b) => b.time - a.time);
  if (dated.length === 0) return { ok: false, reason: 'no item has a parseable pubDate' };

  const { item, time } = dated[0];
  const enclosure = item.enclosure as Record<string, unknown> | undefined;
  const url = typeof item.link === 'string' ? item.link : enclosure?.['@_url'];
  if (typeof item.title !== 'string' || typeof url !== 'string') {
    return { ok: false, reason: 'latest item is missing a title or link' };
  }
  return { ok: true, value: { title: item.title, url, pubDate: new Date(time).toISOString() } };
}
