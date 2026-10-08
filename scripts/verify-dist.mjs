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

// US phone numbers with or without separators, an optional +1, and a parenthesised area code.
// Up to three separator characters between groups, since removing tags leaves extra spaces.
const PHONE = /(?<!\d)(?:\+?1[-.\s]{0,3})?\(?\d{3}\)?[-.\s]{0,3}\d{3}[-.\s]{0,3}\d{4}(?!\d)/;
// A house number followed by a street name and a street-type word, a unit designator, or a
// two-letter state code followed by a ZIP code.
const STREET = /\b\d{1,6}\s+(?:[A-Z][\w'.-]*\s+){1,4}(?:Ave(?:nue)?|St(?:reet)?|R(?:oa)?d|Blvd|Boulevard|Dr(?:ive)?|L(?:a)?ne?|Ct|Court|Pl(?:ace)?|Way|Ter(?:race)?|Pkwy|Parkway|Hwy|Highway|Cir(?:cle)?|Sq(?:uare)?)\b/;
const UNIT = /\b(?:Apt|Apartment|Suite|Ste|Unit)\.?\s*#?\s*\d/i;
const STATE_ZIP = /\b[A-Z]{2},?\s+\d{5}(?:-\d{4})?\b/;

function visibleText(html) {
  return html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ');
}

/**
 * What kinds of contact detail appear in the page. Only the visible text is searched, plus tel:
 * links: URLs elsewhere in the page carry long numeric ids (a Spotify user id is ten digits).
 */
export function contactLeaks(html) {
  const text = visibleText(html);
  const leaks = [];
  if (PHONE.test(text) || /href=["']?tel:/i.test(html)) leaks.push('a phone-number-like string');
  if ([STREET, UNIT, STATE_ZIP].some((re) => re.test(text))) leaks.push('a street-address-like string');
  return leaks;
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
  failures.push(...contactLeaks(resume).map((kind) => `resume/index.html contains ${kind}`));

  return failures;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const failures = verifyDist();
  for (const f of failures) console.error(`verify-dist: ${f}`);
  if (failures.length > 0) process.exit(1);
  console.log(`verify-dist: ${REQUIRED.length} required files present; drafts excluded; resume clean`);
}
