import { describe, expect, it, vi } from 'vitest';
import { fetchRepoMeta } from '../src/lib/enrich/github';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('fetchRepoMeta', () => {
  it('returns stars and last push on success', async () => {
    const fetch = vi.fn(async () => json({ stargazers_count: 42, pushed_at: '2026-09-30T12:00:00Z' }));
    expect(await fetchRepoMeta('jkotzker/example', { fetch })).toEqual({
      ok: true,
      value: { stars: 42, pushedAt: '2026-09-30T12:00:00Z' },
    });
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/jkotzker/example', expect.anything());
  });

  it('sends the token when given', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => json({ stargazers_count: 1, pushed_at: 'x' }));
    await fetchRepoMeta('a/b', { fetch, token: 'abc' });
    const headers = fetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer abc');
  });

  it('omits the Authorization header without a token', async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => json({ stargazers_count: 1, pushed_at: 'x' }));
    await fetchRepoMeta('a/b', { fetch });
    const headers = fetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('reports a non-2xx status', async () => {
    const fetch = vi.fn(async () => json({ message: 'Not Found' }, 404));
    expect(await fetchRepoMeta('a/b', { fetch })).toEqual({ ok: false, reason: 'HTTP 404' });
  });

  it('reports a network failure', async () => {
    const fetch = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    expect(await fetchRepoMeta('a/b', { fetch })).toEqual({ ok: false, reason: 'fetch failed: ECONNRESET' });
  });

  it('reports an unexpected body shape', async () => {
    const fetch = vi.fn(async () => json({ stargazers_count: 'many' }));
    expect(await fetchRepoMeta('a/b', { fetch })).toEqual({ ok: false, reason: 'unexpected response shape' });
  });
});
