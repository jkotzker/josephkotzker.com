// End-to-end test of the résumé contact gate: builds the site with a synthetic résumé that
// contains a fake phone number and street address, then asserts that verify-dist rejects the
// output for both. A gate that only passes on clean input proves nothing; this proves it fires
// on what actually reaches the page.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyDist } from './verify-dist.mjs';

const SENTINEL = 'GATE-SENTINEL-7f3a';
const outDir = mkdtempSync(join(tmpdir(), 'resume-gate-'));
const build = spawnSync('npx', ['astro', 'build', '--outDir', outDir], {
  env: { ...process.env, RESUME_DIR: './tests/fixtures/resume-leak' },
  encoding: 'utf8',
});
if (build.status !== 0) {
  console.error(build.stdout, build.stderr);
  console.error('check-resume-gate: the synthetic build failed');
  process.exit(1);
}

const page = readFileSync(join(outDir, 'resume/index.html'), 'utf8');
if (!page.includes(SENTINEL)) {
  console.error('check-resume-gate: the synthetic résumé did not render, so the gate was not exercised');
  process.exit(1);
}
const failures = verifyDist({ distDir: outDir });
const expected = [
  'resume/index.html contains a phone-number-like string',
  'resume/index.html contains a street-address-like string',
];
const missing = expected.filter((f) => !failures.includes(f));
if (missing.length > 0) {
  for (const m of missing) console.error(`check-resume-gate: not caught: ${m}`);
  process.exit(1);
}
console.log('check-resume-gate: a synthetic résumé with a phone number and an address is rejected');
