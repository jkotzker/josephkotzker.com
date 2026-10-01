// Fails when any root-relative href/src in the built site points at a file that does not exist.
import { access, readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(full);
    else if (entry.name.endsWith('.html')) yield full;
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolves(distDir, href) {
  const path = decodeURI(href.split(/[?#]/)[0]);
  const target = join(distDir, path);
  if (path.endsWith('/')) return exists(join(target, 'index.html'));
  return (await exists(target)) || (await exists(join(target, 'index.html'))) || exists(`${target}.html`);
}

export async function findBrokenLinks(distDir) {
  const broken = [];
  for await (const file of htmlFiles(distDir)) {
    const html = await readFile(file, 'utf8');
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      if (!(await resolves(distDir, href))) broken.push({ file: relative(distDir, file), href });
    }
  }
  return broken;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const distDir = process.argv[2] ?? 'dist';
  const broken = await findBrokenLinks(distDir);
  for (const { file, href } of broken) console.error(`broken link in ${file}: ${href}`);
  if (broken.length > 0) process.exit(1);
  console.log(`check-links: no broken internal links in ${distDir}`);
}
