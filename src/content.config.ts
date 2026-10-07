import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { curatedLoader } from './lib/curated-loader';
import { fetchEpisodes } from './lib/enrich/feed';
import { linkList } from './lib/links';

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
  loader: curatedLoader({ file: 'src/data/projects.yaml' }),
  schema: z.object({
    order: z.number().int(),
    name: z.string(),
    summary: z.string(), // one line, on the home page
    description: z.string(), // two or three sentences, on /projects
    links: linkList,
  }),
});

const podcasts = defineCollection({
  loader: curatedLoader({
    file: 'src/data/podcasts.yaml',
    enrich: async (entry) => {
      if (typeof entry.feed !== 'string') return null;
      const episodes = await fetchEpisodes(entry.feed);
      return episodes.ok ? { ok: true, value: { episodes: episodes.value } } : episodes;
    },
  }),
  schema: z.object({
    order: z.number().int(),
    name: z.string(),
    role: z.string(),
    description: z.string(),
    links: linkList,
    feed: z.url().optional(),
    episodes: z
      .array(
        z.object({
          title: z.string(),
          url: z.url(),
          pubDate: z.coerce.date(),
          season: z.number().int().optional(),
          episode: z.number().int().optional(),
        }),
      )
      .optional(),
  }),
});

// The private jkotzker/resume repo is checked out to .resume/ in CI. Its content
// is rendered only when its front matter says `public: true`, which is added in
// Part 3 after the contact details are split out of resume.md.
const resume = defineCollection({
  loader: glob({ base: './.resume', pattern: 'resume.md' }),
  schema: z.object({ public: z.boolean().default(false) }),
});

export const collections = { posts, projects, podcasts, resume };
