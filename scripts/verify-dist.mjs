// Post-build assertions that unit tests cannot make: required outputs exist,
// drafts never ship, and the resume page carries no phone number.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { XMLValidator } from 'fast-xml-parser';
import { parse } from 'yaml';

const REQUIRED = [
  'index.html', '404.html', 'CNAME', 'rss.xml', 'sitemap-index.xml',
  'blog/index.html', 'projects/index.html', 'podcasts/index.html', 'resume/index.html',
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const posix = (root, file) => relative(root, file).split(sep).join('/');

// Same selection as the content collection: recursive, .md only, no leading underscore.
function postFiles(postsDir) {
  return [...walk(postsDir)].filter((f) => f.endsWith('.md') && !f.split(sep).pop().startsWith('_'));
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function titleForms(title) {
  const escaped = escapeHtml(title);
  return new Set([
    title,
    escaped.replace(/'/g, '&#39;'),
    escaped.replace(/'/g, '&#x27;'),
    escaped.replace(/'/g, '&apos;'),
  ]);
}

export function verifyDist({ distDir = 'dist', postsDir = 'src/content/posts', site = 'josephkotzker.com' } = {}) {
  const failures = [];

  for (const path of REQUIRED) {
    if (!existsSync(join(distDir, path))) failures.push(`missing ${path}`);
  }

  if (existsSync(join(distDir, 'CNAME')) && readFileSync(join(distDir, 'CNAME'), 'utf8').trim() !== site) {
    failures.push(`CNAME is not ${site}`);
  }

  const rssPath = join(distDir, 'rss.xml');
  const rss = existsSync(rssPath) ? readFileSync(rssPath, 'utf8') : '';
  if (rss && XMLValidator.validate(rss) !== true) failures.push('rss.xml is not well-formed XML');

  // Every page and feed is searched, so a leak is caught wherever it lands (page, feed, sitemap).
  const outputs = existsSync(distDir)
    ? [...walk(distDir)]
        .filter((f) => f.endsWith('.html') || f.endsWith('.xml'))
        .map((file) => ({ path: posix(distDir, file), text: readFileSync(file, 'utf8') }))
    : [];

  if (!existsSync(postsDir)) {
    failures.push(`missing posts directory ${postsDir}`);
  } else {
    for (const file of postFiles(postsDir)) {
      const source = readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
      const match = source.match(/^---\n([\s\S]*?)\n---/);
      let front = {};
      try {
        front = match ? parse(match[1]) : {};
      } catch {
        failures.push(`could not parse front matter in ${posix(postsDir, file)}`);
        continue;
      }
      if (front?.draft !== true || typeof front.title !== 'string') continue;
      const forms = [...titleForms(front.title)];
      for (const { path, text } of outputs) {
        if (forms.some((form) => text.includes(form))) failures.push(`draft "${front.title}" appears in ${path}`);
      }
    }
  }

  // Backstop only; the real control is the public: true opt-in plus the split source.
  const resumePath = join(distDir, 'resume/index.html');
  const resume = existsSync(resumePath) ? readFileSync(resumePath, 'utf8') : '';
  if (/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/.test(resume)) failures.push('resume/index.html contains a phone-number-like string');

  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failures = verifyDist();
  for (const f of failures) console.error(`verify-dist: ${f}`);
  if (failures.length > 0) process.exit(1);
  console.log(`verify-dist: ${REQUIRED.length} required files present; drafts excluded; resume clean`);
}
