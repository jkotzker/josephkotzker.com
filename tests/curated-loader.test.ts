import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { curatedLoader } from '../src/lib/curated-loader';

function yamlFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'curated-'));
  const path = join(dir, 'data.yaml');
  writeFileSync(path, content);
  return path;
}

type ParseData = (arg: { id: string; data: Record<string, unknown> }) => Promise<Record<string, unknown>>;

function fakeContext(parseData?: ParseData) {
  const entries = new Map<string, Record<string, unknown>>();
  const warnings: string[] = [];
  const ctx = {
    store: {
      clear: () => entries.clear(),
      set: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
        entries.set(id, data);
        return true;
      },
    },
    parseData: parseData ?? (async ({ data }) => data),
    logger: { warn: (m: string) => warnings.push(m), info: () => {}, error: () => {}, debug: () => {} },
  };
  return { entries, warnings, ctx };
}

const yaml = `
- id: alpha
  name: Alpha
  repo: o/alpha
- id: beta
  name: Beta
`;

describe('curatedLoader', () => {
  it('merges enrichment into entries that have it', async () => {
    const { entries, ctx } = fakeContext();
    const loader = curatedLoader({
      file: yamlFile(yaml),
      enrich: async (e) => (e.repo ? { ok: true, value: { stars: 5 } } : null),
    });
    await loader.load(ctx as never);
    expect(entries.get('alpha')).toEqual({ id: 'alpha', name: 'Alpha', repo: 'o/alpha', stars: 5 });
    expect(entries.get('beta')).toEqual({ id: 'beta', name: 'Beta' });
  });

  it('keeps curated fields and warns when enrichment fails', async () => {
    const { entries, warnings, ctx } = fakeContext();
    const loader = curatedLoader({
      file: yamlFile(yaml),
      enrich: async (e) => (e.repo ? { ok: false, reason: 'HTTP 404' } : null),
    });
    await loader.load(ctx as never);
    expect(entries.get('alpha')).toEqual({ id: 'alpha', name: 'Alpha', repo: 'o/alpha' });
    expect(warnings).toEqual(['alpha: enrichment skipped (HTTP 404)']);
  });

  it('lets curated fields win over enrichment on key collisions', async () => {
    const { entries, ctx } = fakeContext();
    const loader = curatedLoader({
      file: yamlFile('- id: a\n  name: Curated\n'),
      enrich: async () => ({ ok: true, value: { name: 'Fetched', stars: 1 } }),
    });
    await loader.load(ctx as never);
    expect(entries.get('a')).toEqual({ id: 'a', name: 'Curated', stars: 1 });
  });

  it('accepts an empty list', async () => {
    const { entries, ctx } = fakeContext();
    await curatedLoader({ file: yamlFile('[]\n'), enrich: async () => null }).load(ctx as never);
    expect(entries.size).toBe(0);
  });

  it('rejects a file that is not a list', async () => {
    const { ctx } = fakeContext();
    const loader = curatedLoader({ file: yamlFile('name: x\n'), enrich: async () => null });
    await expect(loader.load(ctx as never)).rejects.toThrow('expected a YAML list');
  });

  it('rejects an entry without a string id', async () => {
    const { ctx } = fakeContext();
    const loader = curatedLoader({ file: yamlFile('- name: x\n'), enrich: async () => null });
    await expect(loader.load(ctx as never)).rejects.toThrow('every entry needs a string id');
  });

  it('rejects duplicate ids', async () => {
    const { ctx } = fakeContext();
    const loader = curatedLoader({ file: yamlFile('- id: a\n- id: a\n'), enrich: async () => null });
    await expect(loader.load(ctx as never)).rejects.toThrow('duplicate id "a"');
  });

  it('discards enrichment and warns when merged data fails validation', async () => {
    const { entries, warnings, ctx } = fakeContext(async ({ data }) => {
      if (data.stars === 'bad') throw new Error('stars: expected number');
      return data;
    });
    const loader = curatedLoader({
      file: yamlFile('- id: alpha\n  name: Alpha\n'),
      enrich: async () => ({ ok: true, value: { stars: 'bad' } }),
    });
    await loader.load(ctx as never);
    expect(entries.get('alpha')).toEqual({ id: 'alpha', name: 'Alpha' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^alpha: enrichment discarded/);
  });

  it('still fails when the curated data itself fails validation', async () => {
    const { ctx } = fakeContext(async () => {
      throw new Error('name: required');
    });
    const loader = curatedLoader({
      file: yamlFile('- id: alpha\n'),
      enrich: async () => ({ ok: true, value: { stars: 1 } }),
    });
    await expect(loader.load(ctx as never)).rejects.toThrow('name: required');
  });

  it('keeps the curated entry and warns when the enricher throws', async () => {
    const { entries, warnings, ctx } = fakeContext();
    const loader = curatedLoader({
      file: yamlFile('- id: alpha\n  name: Alpha\n'),
      enrich: async () => {
        throw new Error('boom');
      },
    });
    await loader.load(ctx as never);
    expect(entries.get('alpha')).toEqual({ id: 'alpha', name: 'Alpha' });
    expect(warnings).toEqual(['alpha: enrichment skipped (boom)']);
  });
});
