// Fails when any internal href/src/srcset URL in the built site points at a file that does not exist.
// Internal means root-relative ("/x") or absolute on the site's own origin. Unquoted attributes are out of scope.
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const OWN_ORIGIN = /^https?:\/\/josephkotzker\.com(?=[/?#]|$)/i;
const CANONICAL_LINK = /<link\b[^>]*\brel\s*=\s*(?:"canonical"|'canonical')[^>]*>/gi;
const ATTRIBUTE = /\b(href|srcset|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

async function isFile(path) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function candidates(name, value) {
  if (name.toLowerCase() !== 'srcset') return [value];
  return value.split(',').map((part) => part.trim().split(/\s+/)[0]).filter(Boolean);
}

// Returns the root-relative part of an internal URL, or null when the URL is not internal.
function internalPath(url) {
  if (url.startsWith('//')) return null;
  if (url.startsWith('/')) return url;
  const origin = url.match(OWN_ORIGIN);
  if (!origin) return null;
  const rest = url.slice(origin[0].length);
  return rest === '' || rest[0] !== '/' ? `/${rest}` : rest;
}

// Returns null when the link resolves to a file, otherwise a short reason.
async function problem(distDir, path) {
  let decoded;
  try {
    decoded = decodeURI(path.split(/[?#]/)[0]);
  } catch {
    return 'malformed percent-encoding';
  }
  const target = join(distDir, decoded);
  const inside = relative(distDir, target);
  if (inside.startsWith('..')) return 'path escapes the site root';
  const found = decoded.endsWith('/')
    ? await isFile(join(target, 'index.html'))
    : (await isFile(target)) || (await isFile(join(target, 'index.html'))) || (await isFile(`${target}.html`));
  return found ? null : 'target file not found';
}

export async function findBrokenLinks(distDir) {
  let info;
  try {
    info = await stat(distDir);
  } catch {
    info = null;
  }
  if (!info?.isDirectory()) throw new Error(`dist directory not found: ${distDir}`);

  const broken = [];
  for await (const file of htmlFiles(distDir)) {
    let html = await readFile(file, 'utf8');
    // The error page is served from /404.html, but its canonical URL is the unresolvable /404/. Skip only that tag.
    if (relative(distDir, file) === '404.html') html = html.replace(CANONICAL_LINK, '');
    for (const [, name, double, single] of html.matchAll(ATTRIBUTE)) {
      for (const url of candidates(name, double ?? single)) {
        const path = internalPath(url);
        if (path === null) continue;
        const reason = await problem(distDir, path);
        if (reason !== null) {
          broken.push({ file: relative(distDir, file).split(sep).join('/'), href: url, ...(reason === 'target file not found' ? {} : { reason }) });
        }
      }
    }
  }
  return broken;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const distDir = process.argv[2] ?? 'dist';
  let broken;
  try {
    broken = await findBrokenLinks(distDir);
  } catch (error) {
    console.error(`check-links: ${error.message}`);
    process.exit(1);
  }
  for (const { file, href, reason } of broken) {
    console.error(`broken link in ${file}: ${href}${reason ? ` (${reason})` : ''}`);
  }
  if (broken.length > 0) process.exit(1);
  console.log(`check-links: no broken internal links in ${distDir}`);
}
