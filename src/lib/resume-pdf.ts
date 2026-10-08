import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Where the résumé repo is checked out (CI) or pointed at (RESUME_DIR, for checks and previews). */
export const resumeDir = () => process.env.RESUME_DIR ?? './.resume';

/** Where the public PDF is served on the site. */
export const RESUME_PDF_HREF = '/resume/joseph-kotzker-resume.pdf';

/**
 * The public résumé PDF, built by the résumé repo's own script (`npm run build:public`, which never
 * reads its contact file) before the site builds, or null when it was not built.
 */
export function publicResumePdf(): Uint8Array<ArrayBuffer> | null {
  const path = join(resumeDir(), 'dist/resume-public.pdf');
  return existsSync(path) ? Uint8Array.from(readFileSync(path)) : null;
}
