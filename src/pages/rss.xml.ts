import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { visiblePosts } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = visiblePosts(await getCollection('posts'), { includeDrafts: false });
  return rss({
    title: 'Joseph Kotzker',
    description: 'Writing by Joseph Kotzker.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
  });
}
