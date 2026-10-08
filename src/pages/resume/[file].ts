import type { APIRoute, GetStaticPaths } from 'astro';
import { getEntry } from 'astro:content';
import { publicResumePdf } from '../../lib/resume-pdf';

// Emits /resume/joseph-kotzker-resume.pdf only when the résumé is public and its PDF was built.
export const getStaticPaths = (async () => {
  const entry = await getEntry('resume', 'resume');
  return entry?.data.public === true && publicResumePdf() ? [{ params: { file: 'joseph-kotzker-resume.pdf' } }] : [];
}) satisfies GetStaticPaths;

export const GET: APIRoute = () =>
  new Response(publicResumePdf(), { headers: { 'Content-Type': 'application/pdf' } });
