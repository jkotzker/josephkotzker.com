// @ts-check
// Expressive Code, configured as in the adopted post prototype (design/forks/055): a site-palette
// syntax theme, one frame style for every block, and chrome in the page's own colours.
import { defineEcConfig, ExpressiveCodeTheme } from 'astro-expressive-code';
import { tokenColors } from './src/lib/token-colors.mjs';

const T = tokenColors();
/** @param {'light' | 'dark'} type */
const siteTheme = (type) =>
  new ExpressiveCodeTheme({
    name: `site-${type}`,
    type,
    colors: { 'editor.background': T[type].bg, 'editor.foreground': T[type].text },
    // Text colour; comments muted italic; literals in the link colour; keywords bold.
    tokenColors: [
      { scope: ['comment', 'punctuation.definition.comment', 'string.quoted.docstring'], settings: { foreground: T[type]['text-muted'], fontStyle: 'italic' } },
      { scope: ['string', 'constant', 'constant.numeric', 'constant.language', 'support.constant', 'constant.character.escape'], settings: { foreground: T[type].link } },
      { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.control'], settings: { fontStyle: 'bold' } },
    ],
  });
/** @param {'bg' | 'rule' | 'text-muted'} k */
const t = (k) => /** @param {{ theme: ExpressiveCodeTheme }} ctx */ ({ theme }) => T[/** @type {'light' | 'dark'} */ (theme.type)][k];
// Overridden by site.css with var(--font-mono); kept as the fallback stack.
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

export default defineEcConfig({
  themes: [siteTheme('light'), siteTheme('dark')],
  useDarkModeMediaQuery: true,
  minSyntaxHighlightingColorContrast: 4.5,
  defaultProps: { frame: 'code' },
  styleOverrides: {
    borderRadius: '1px', // the outer corner is radius + border: 2px, the site's --radius-focus
    borderWidth: '1px',
    borderColor: t('rule'),
    codeBackground: t('bg'),
    codeFontFamily: MONO,
    uiFontFamily: MONO,
    codeFontSize: '0.92rem',
    uiFontSize: '0.8rem',
    codeLineHeight: '1.6',
    frames: {
      frameBoxShadowCssValue: 'none',
      editorTabBarBackground: t('bg'),
      editorActiveTabBackground: t('bg'),
      editorTabBarBorderBottomColor: t('rule'),
      editorActiveTabForeground: t('text-muted'),
      editorActiveTabIndicatorTopColor: 'transparent',
      editorActiveTabIndicatorBottomColor: 'transparent',
      editorActiveTabBorderColor: t('rule'),
      editorTabBarBorderColor: 'transparent',
      terminalBackground: t('bg'),
      terminalTitlebarBackground: t('bg'),
      terminalTitlebarForeground: t('text-muted'),
      terminalTitlebarBorderBottomColor: t('rule'),
      terminalTitlebarDotsOpacity: '0',
    },
  },
});
