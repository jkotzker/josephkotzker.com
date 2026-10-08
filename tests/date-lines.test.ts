import { describe, expect, it } from 'vitest';
import { dateLine } from '../src/lib/date-lines.mjs';

const p = (value: string) => ({ type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value }] });
const shape = (nodes: any[] | null) => nodes?.map((n) => (n.type === 'element' ? `<${n.tagName}>${n.children[0].value}` : n.value));

describe('dateLine', () => {
  it('marks up a range ending in present', () => {
    expect(shape(dateLine(p('2026-04 – present')))).toEqual(['<time>2026-04', ' – ', 'present']);
    expect(dateLine(p('2026-04 – present'))?.[0]).toMatchObject({ properties: { dateTime: '2026-04' } });
  });

  it('marks up a closed range and a single date', () => {
    expect(shape(dateLine(p('2023-01 – 2026-04')))).toEqual(['<time>2023-01', ' – ', '<time>2026-04']);
    expect(shape(dateLine(p('2017-05')))).toEqual(['<time>2017-05']);
  });

  it('accepts a hyphen as the separator and surrounding whitespace', () => {
    expect(shape(dateLine(p(' 2023-01 - 2026-04\n')))).toEqual(['<time>2023-01', ' – ', '<time>2026-04']);
  });

  it('leaves ordinary sentences, year-only ranges and inline markup alone', () => {
    expect(dateLine(p('Since 2023-01 I have worked at Fandom.'))).toBeNull();
    expect(dateLine(p('2023 – 2026'))).toBeNull();
    const withLink = { ...p(''), children: [{ type: 'element', tagName: 'a', properties: {}, children: [{ type: 'text', value: '2023-01' }] }] };
    expect(dateLine(withLink)).toBeNull();
  });
});
