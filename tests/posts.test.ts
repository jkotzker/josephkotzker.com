import { describe, expect, it } from 'vitest';
import { visiblePosts } from '../src/lib/posts';

const post = (id: string, pubDate: string, draft = false) => ({
  id,
  data: { pubDate: new Date(pubDate), draft },
});

describe('visiblePosts', () => {
  const posts = [
    post('old', '2024-01-01'),
    post('draft', '2025-06-01', true),
    post('new', '2025-01-01'),
  ];

  it('drops drafts when includeDrafts is false', () => {
    expect(visiblePosts(posts, { includeDrafts: false }).map((p) => p.id)).toEqual(['new', 'old']);
  });

  it('keeps drafts when includeDrafts is true', () => {
    expect(visiblePosts(posts, { includeDrafts: true }).map((p) => p.id)).toEqual(['draft', 'new', 'old']);
  });

  it('does not mutate its input', () => {
    const copy = [...posts];
    visiblePosts(posts, { includeDrafts: true });
    expect(posts).toEqual(copy);
  });
});
