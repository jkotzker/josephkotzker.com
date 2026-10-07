import { describe, expect, it } from 'vitest';
import { linkList, primaryLink } from '../src/lib/links';

const src = { kind: 'source', url: 'https://github.com/x/y' };
const site = { kind: 'website', url: 'https://y.test' };

describe('linkList', () => {
  it('accepts exactly one primary link and keeps authored order', () => {
    const parsed = linkList.parse([src, { ...site, primary: true }]);
    expect(parsed.map((l) => l.kind)).toEqual(['source', 'website']);
    expect(primaryLink(parsed).url).toBe('https://y.test');
  });

  it('defaults primary to false', () => {
    expect(linkList.parse([{ ...src, primary: true }, site])[1].primary).toBe(false);
  });

  it('rejects a list with no primary link', () => {
    expect(linkList.safeParse([src, site]).success).toBe(false);
  });

  it('rejects a list with two primary links', () => {
    expect(linkList.safeParse([{ ...src, primary: true }, { ...site, primary: true }]).success).toBe(false);
  });

  it('rejects an empty list', () => {
    expect(linkList.safeParse([]).success).toBe(false);
  });

  it('rejects an unknown kind and a malformed URL', () => {
    expect(linkList.safeParse([{ kind: 'myspace', url: 'https://x.test', primary: true }]).success).toBe(false);
    expect(linkList.safeParse([{ kind: 'website', url: 'not a url', primary: true }]).success).toBe(false);
  });
});
