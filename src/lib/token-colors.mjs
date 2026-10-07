// Reads the colour tokens out of design/tokens.css for build-time consumers that need literal
// values (Expressive Code adjusts syntax colours for contrast, so a var() will not do).
import { readFileSync } from 'node:fs';

const NAMES = ['bg', 'text', 'text-muted', 'link', 'rule'];

/** @param {string} css @returns {{ light: Record<string, string>, dark: Record<string, string> }} */
export function parseTokenColors(css) {
  const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
  if (darkStart === -1) throw new Error('tokens.css: no prefers-color-scheme: dark block');
  const read = (/** @type {string} */ block, /** @type {string} */ scheme) =>
    Object.fromEntries(
      NAMES.map((n) => {
        const m = new RegExp(`--color-${n}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`).exec(block);
        if (!m) throw new Error(`tokens.css: --color-${n} missing from the ${scheme} block`);
        return [n, m[1].toLowerCase()];
      }),
    );
  return { light: read(css.slice(0, darkStart), 'light'), dark: read(css.slice(darkStart), 'dark') };
}

export function tokenColors(path = new URL('../../design/tokens.css', import.meta.url)) {
  return parseTokenColors(readFileSync(path, 'utf8'));
}
