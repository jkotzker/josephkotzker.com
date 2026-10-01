export type PostLike = { data: { pubDate: Date; draft: boolean } };

/** Posts to show, newest first. Drafts are included only when asked (dev server). */
export function visiblePosts<T extends PostLike>(posts: T[], opts: { includeDrafts: boolean }): T[] {
  return posts
    .filter((p) => opts.includeDrafts || !p.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}
