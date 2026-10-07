import { z } from 'astro/zod';

/** Link kinds, their labels and their icons, in the order the prototypes show them (design/forks/058, 059). */
export const LINK_KINDS = {
  source: { label: 'Source', icon: 'source' },
  homebrew: { label: 'Homebrew', icon: 'homebrew' },
  website: { label: 'Website', icon: 'website' },
  appstore: { label: 'App Store', icon: 'appstore' },
  download: { label: 'Download', icon: 'download' },
  applepodcasts: { label: 'Apple Podcasts', icon: 'applepodcasts' },
  overcast: { label: 'Overcast', icon: 'overcast' },
  spotify: { label: 'Spotify', icon: 'spotify' },
  youtube: { label: 'YouTube', icon: 'youtube' },
  rss: { label: 'RSS', icon: 'rss' },
} as const;

export type LinkKind = keyof typeof LINK_KINDS;

const link = z.object({
  kind: z.enum(Object.keys(LINK_KINDS) as [LinkKind, ...LinkKind[]]),
  url: z.url(),
  primary: z.boolean().default(false),
});

export type Link = z.infer<typeof link>;

/**
 * A row of links in authored order. Exactly one is primary: it is where the entry's name
 * links on the home page, which shows the name only.
 */
export const linkList = z
  .array(link)
  .min(1)
  .refine((links) => links.filter((l) => l.primary).length === 1, {
    message: 'exactly one link must have primary: true',
  });

export function primaryLink(links: Link[]): Link {
  const found = links.find((l) => l.primary);
  if (!found) throw new Error('no primary link');
  return found;
}
