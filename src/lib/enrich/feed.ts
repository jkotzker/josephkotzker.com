import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { errorMessage, type FetchFn, type Result } from '../result';

export type Episode = { title: string; url: string; pubDate: string; season?: number; episode?: number };

const TIMEOUT_MS = 10_000;
const DEFAULT_COUNT = 6;

export async function fetchEpisodes(
  feedUrl: string,
  opts: { fetch?: FetchFn; count?: number } = {},
): Promise<Result<Episode[]>> {
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
  return parseEpisodes(xml, opts.count);
}

/** The newest `count` episodes, newest first. Items without a title, link or parseable date are skipped. */
export function parseEpisodes(xml: string, count = DEFAULT_COUNT): Result<Episode[]> {
  const valid = XMLValidator.validate(xml);
  if (valid !== true) return { ok: false, reason: `invalid XML: ${valid.err.msg}` };

  const doc = new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(xml);
  const raw = doc?.rss?.channel?.item;
  const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (items.length === 0) return { ok: false, reason: 'feed has no items' };

  const episodes = items
    .map(toEpisode)
    .filter((e): e is Episode => e !== null)
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
    .slice(0, count);
  if (episodes.length === 0) return { ok: false, reason: 'no item has a title, link and parseable pubDate' };
  return { ok: true, value: episodes };
}

function toEpisode(item: Record<string, unknown>): Episode | null {
  const time = Date.parse(String(item.pubDate ?? ''));
  const enclosure = item.enclosure as Record<string, unknown> | undefined;
  const url = typeof item.link === 'string' ? item.link : enclosure?.['@_url'];
  if (Number.isNaN(time) || typeof item.title !== 'string' || typeof url !== 'string') return null;

  const { title, season, episode } = splitTitle(item.title);
  return {
    title,
    url,
    pubDate: new Date(time).toISOString(),
    season: season ?? toInt(item['itunes:season']),
    episode: episode ?? toInt(item['itunes:episode']),
  };
}

/**
 * In Reverse numbers episodes only in the title ("S3E8. Film - Subtitle"); the feed has
 * itunes:season but no itunes:episode. The prefix moves into season/episode, and the
 * spaced hyphen separating film and subtitle becomes the site's em dash.
 */
export function splitTitle(raw: string): { title: string; season?: number; episode?: number } {
  const m = /^S(\d+)E(\d+)\.\s*/i.exec(raw);
  const rest = m ? raw.slice(m[0].length) : raw;
  const title = rest.replaceAll(' - ', ' — ').trim();
  return m ? { title, season: Number(m[1]), episode: Number(m[2]) } : { title };
}

function toInt(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v.trim()) : NaN;
  return Number.isInteger(n) && n > 0 ? n : undefined;
}
