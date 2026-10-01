import { errorMessage, type FetchFn, type Result } from '../result';

export type RepoMeta = { stars: number; pushedAt: string };

const TIMEOUT_MS = 10_000;

export async function fetchRepoMeta(
  repo: string,
  opts: { fetch?: FetchFn; token?: string } = {},
): Promise<Result<RepoMeta>> {
  const doFetch = opts.fetch ?? fetch;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'josephkotzker.com-build',
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await doFetch(`https://api.github.com/repos/${repo}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    return { ok: false, reason: `fetch failed: ${errorMessage(e)}` };
  }
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (typeof body?.stargazers_count !== 'number' || typeof body?.pushed_at !== 'string') {
    return { ok: false, reason: 'unexpected response shape' };
  }
  return { ok: true, value: { stars: body.stargazers_count, pushedAt: body.pushed_at } };
}
