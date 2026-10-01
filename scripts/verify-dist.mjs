// Post-build assertions that unit tests cannot make: required outputs exist,
// drafts never ship, and the resume page carries no phone number.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { XMLValidator } from 'fast-xml-parser';
import { parse } from 'yaml';

const dist = 'dist';
const failures = [];

const required = [
  'index.html', '404.html', 'CNAME', 'rss.xml', 'sitemap-index.xml',
  'blog/index.html', 'projects/index.html', 'podcasts/index.html', 'resume/index.html',
];
for (const path of required) {
  if (!existsSync(join(dist, path))) failures.push(`missing ${path}`);
}

if (existsSync(join(dist, 'CNAME')) && readFileSync(join(dist, 'CNAME'), 'utf8').trim() !== 'josephkotzker.com') {
  failures.push('CNAME is not josephkotzker.com');
}

const rss = existsSync(join(dist, 'rss.xml')) ? readFileSync(join(dist, 'rss.xml'), 'utf8') : '';
if (rss && XMLValidator.validate(rss) !== true) failures.push('rss.xml is not well-formed XML');

const postsDir = 'src/content/posts';
const blogIndex = existsSync(join(dist, 'blog/index.html')) ? readFileSync(join(dist, 'blog/index.html'), 'utf8') : '';
for (const name of readdirSync(postsDir).filter((f) => f.endsWith('.md'))) {
  const match = readFileSync(join(postsDir, name), 'utf8').match(/^---\n([\s\S]*?)\n---/);
  const front = match ? parse(match[1]) : {};
  if (front?.draft === true && typeof front.title === 'string') {
    if (rss.includes(front.title)) failures.push(`draft "${front.title}" appears in rss.xml`);
    if (blogIndex.includes(front.title)) failures.push(`draft "${front.title}" appears in blog/index.html`);
  }
}

// Backstop only; the real control is the public: true opt-in plus the split source.
const resume = existsSync(join(dist, 'resume/index.html')) ? readFileSync(join(dist, 'resume/index.html'), 'utf8') : '';
if (/\(?\b\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/.test(resume)) failures.push('resume/index.html contains a phone-number-like string');

for (const f of failures) console.error(`verify-dist: ${f}`);
if (failures.length > 0) process.exit(1);
console.log(`verify-dist: ${required.length} required files present; drafts excluded; resume clean`);
