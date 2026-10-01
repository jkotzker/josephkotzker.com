export function findBrokenLinks(
  distDir: string,
): Promise<Array<{ file: string; href: string; reason?: string }>>;
