export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
