// Turns a paragraph that is only a date or date range, directly under an h3, into the muted
// date line of the résumé design (design/forks/056): <p class="meta"><time>2022-05</time> – present</p>.
// The source stays plain Markdown ("2022-05 – present" on its own line under a role heading).
// Registered as a Sätteri hast plugin in astro.config.mjs.

const DATE = String.raw`\d{4}-\d{2}(?:-\d{2})?`;
const LINE = new RegExp(`^(${DATE})(?:\\s+[–-]\\s+(present|${DATE}))?$`);

const time = (value) => ({
  type: 'element',
  tagName: 'time',
  properties: { dateTime: value },
  children: [{ type: 'text', value }],
});

/**
 * The children for a date line, or null when the paragraph is not one. A paragraph holding any
 * element (a link, emphasis) is left alone.
 */
export function dateLine(paragraph) {
  const kids = paragraph.children ?? [];
  if (kids.some((c) => c.type !== 'text')) return null;
  const m = LINE.exec(kids.map((c) => c.value).join('').trim());
  if (!m) return null;
  const [, start, end] = m;
  if (!end) return [time(start)];
  return [time(start), { type: 'text', value: ' – ' }, end === 'present' ? { type: 'text', value: 'present' } : time(end)];
}

/** The nearest element before `node` among its siblings (whitespace text nodes are skipped). */
function previousElement(node, ctx) {
  const parent = ctx.parent(node);
  const index = ctx.indexOf(node);
  if (!parent || index === undefined) return undefined;
  for (let i = index - 1; i >= 0; i--) {
    const sibling = parent.children[i];
    if (sibling.type === 'element') return sibling;
    if (sibling.type === 'text' && sibling.value.trim() !== '') return undefined;
  }
  return undefined;
}

export const dateLinesPlugin = {
  name: 'josephkotzker-date-lines',
  element: {
    filter: ['p'],
    visit(node, ctx) {
      if (previousElement(node, ctx)?.tagName !== 'h3') return;
      const children = dateLine(node);
      if (!children) return;
      ctx.replaceNode(node, { type: 'element', tagName: 'p', properties: { className: ['meta'] }, children });
    },
  },
};
