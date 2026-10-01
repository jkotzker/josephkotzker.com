import { readFile } from 'node:fs/promises';
import type { Loader } from 'astro/loaders';
import { parse } from 'yaml';
import type { Result } from './result';

export type CuratedEntry = Record<string, unknown> & { id: string };
export type Enricher = (entry: CuratedEntry) => Promise<Result<Record<string, unknown>> | null>;

/**
 * Loads a hand-maintained YAML list and adds build-time details to each entry.
 * Curated fields always win over fetched ones; a failed fetch logs a warning and
 * keeps the curated entry. Malformed curated data throws, failing the build.
 */
export function curatedLoader(opts: { file: string; enrich: Enricher }): Loader {
  return {
    name: 'curated-loader',
    load: async ({ store, parseData, logger }) => {
      const raw: unknown = parse(await readFile(opts.file, 'utf8'));
      if (!Array.isArray(raw)) throw new Error(`${opts.file}: expected a YAML list`);

      const seen = new Set<string>();
      store.clear();
      for (const item of raw) {
        if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') {
          throw new Error(`${opts.file}: every entry needs a string id`);
        }
        const entry = item as CuratedEntry;
        if (seen.has(entry.id)) throw new Error(`${opts.file}: duplicate id "${entry.id}"`);
        seen.add(entry.id);

        const enriched = await opts.enrich(entry);
        let data: Record<string, unknown> = entry;
        if (enriched?.ok) data = { ...enriched.value, ...entry };
        else if (enriched) logger.warn(`${entry.id}: enrichment skipped (${enriched.reason})`);

        store.set({ id: entry.id, data: await parseData({ id: entry.id, data }) });
      }
    },
  };
}
