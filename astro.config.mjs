// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import { satteri } from '@astrojs/markdown-satteri';
import { dateLinesPlugin } from './src/lib/date-lines.mjs';

export default defineConfig({
  site: 'https://josephkotzker.com',
  integrations: [expressiveCode(), sitemap()],
  // Sätteri is Astro's default Markdown processor; Expressive Code adds its own hast plugin to this list.
  markdown: { processor: satteri({ hastPlugins: [dateLinesPlugin] }) },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Source Serif 4',
      cssVariable: '--font-source-serif',
      weights: [400, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Source Code Pro',
      cssVariable: '--font-source-code',
      weights: [400, 700],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['monospace'],
    },
  ],
});
