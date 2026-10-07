import { describe, expect, it } from 'vitest';
import { parseTokenColors, tokenColors } from '../src/lib/token-colors.mjs';

describe('tokenColors', () => {
  it('reads both schemes from design/tokens.css', () => {
    expect(tokenColors()).toEqual({
      light: { bg: '#ebebeb', text: '#131211', 'text-muted': '#6f6966', link: '#1f63dc', rule: '#cccbc4' },
      dark: { bg: '#22211e', text: '#e9e6e0', 'text-muted': '#929292', link: '#00c7fc', rule: '#494949' },
    });
  });

  it('does not confuse --color-text with --color-text-muted', () => {
    const css = ':root { --color-text-muted: #222; --color-text: #111; --color-bg: #fff; --color-link: #00f; --color-rule: #ccc; }\n' +
      '@media (prefers-color-scheme: dark) { :root { --color-text-muted: #999; --color-text: #eee; --color-bg: #000; --color-link: #0ff; --color-rule: #444; } }';
    const { light } = parseTokenColors(css);
    expect([light.text, light['text-muted']]).toEqual(['#111', '#222']);
  });

  it('fails loudly when a token or the dark block is missing', () => {
    expect(() => parseTokenColors(':root { --color-bg: #fff; }')).toThrow(/dark block/);
    expect(() => parseTokenColors(':root {}\n@media (prefers-color-scheme: dark) {}')).toThrow(/--color-bg missing from the light block/);
  });
});
