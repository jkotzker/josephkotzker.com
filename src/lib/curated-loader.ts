import { readFile } from 'node:fs/promises';
import type { Loader } from 'astro/loaders';
import { parse } from 'yaml';
import { errorMessage, type Result } from './result';

export type CuratedEntry = Record<string, unknown> & { id: string };
export type Enricher = (entry: CuratedEntry) => Promise<Result<Record<string, unknown>> | null>;

/**
 * Loads a hand-maintained YAML list and, given an enricher, adds build-time details to each entry.
 * Curated fields always win over fetched ones; a failed fetch logs a warning and
 * keeps the curated entry; so does fetched data that fails schema validation.
 * Malformed curated data throws, failing the build.
 *
 * Each entry gets `order`, its position in the file, because the content store does not keep
 * insertion order; list pages sort by it (see `inAuthoredOrder`).
 */
export function curatedLoader(opts: { file: string; enrich?: Enricher }): Loader {
  return {
    name: 'curated-loader',
    load: async ({ store, parseData, logger }) => {
      const raw: unknown = parse(await readFile(opts.file, 'utf8'));
      if (!Array.isArray(raw)) throw new Error(`${opts.file}: expected a YAML list`);

      const seen = new Set<string>();
      store.clear();
      for (const [order, item] of raw.entries()) {
        if (!item || typeof item !== 'object' || typeof (item as { id?: unknown }).id !== 'string') {
          throw new Error(`${opts.file}: every entry needs a string id`);
        }
        const entry = { ...(item as CuratedEntry), order };
        if (seen.has(entry.id)) throw new Error(`${opts.file}: duplicate id "${entry.id}"`);
        seen.add(entry.id);

        let enriched: Result<Record<string, unknown>> | null = null;
        try {
          enriched = opts.enrich ? await opts.enrich(entry) : null;
        } catch (e) {
          logger.warn(`${entry.id}: enrichment skipped (${errorMessage(e)})`);
        }
        if (enriched && !enriched.ok) logger.warn(`${entry.id}: enrichment skipped (${enriched.reason})`);

        let parsed: Record<string, unknown>;
        if (enriched?.ok) {
          try {
            parsed = await parseData({ id: entry.id, data: { ...enriched.value, ...entry } });
          } catch (e) {
            logger.warn(
              `${entry.id}: enrichment discarded (fetched data failed validation: ${errorMessage(e)})`,
            );
            parsed = await parseData({ id: entry.id, data: entry });
          }
        } else {
          parsed = await parseData({ id: entry.id, data: entry });
        }

        store.set({ id: entry.id, data: parsed });
      }
    },
  };
}

/** Curated entries in the order they are written in their YAML file. */
export function inAuthoredOrder<T extends { data: { order: number } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.data.order - b.data.order);
}
