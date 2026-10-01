import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { curatedLoader } from './lib/curated-loader';
import { fetchLatestEpisode } from './lib/enrich/feed';
import { fetchRepoMeta } from './lib/enrich/github';

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/[^_]*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: curatedLoader({
    file: 'src/data/projects.yaml',
    enrich: async (entry) =>
      typeof entry.repo === 'string' ? fetchRepoMeta(entry.repo, { token: process.env.GITHUB_TOKEN }) : null,
  }),
  schema: z.object({
    name: z.string(),
    url: z.url(),
    description: z.string(),
    repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'repo must be owner/name').optional(),
    stars: z.number().int().optional(),
    pushedAt: z.coerce.date().optional(),
  }),
});

const podcasts = defineCollection({
  loader: curatedLoader({
    file: 'src/data/podcasts.yaml',
    enrich: async (entry) => {
      if (typeof entry.feed !== 'string') return null;
      const latest = await fetchLatestEpisode(entry.feed);
      return latest.ok ? { ok: true, value: { latestEpisode: latest.value } } : latest;
    },
  }),
  schema: z.object({
    name: z.string(),
    url: z.url(),
    role: z.string(),
    description: z.string(),
    feed: z.url().optional(),
    latestEpisode: z
      .object({ title: z.string(), url: z.url(), pubDate: z.coerce.date() })
      .optional(),
  }),
});

export const collections = { posts, projects, podcasts };
