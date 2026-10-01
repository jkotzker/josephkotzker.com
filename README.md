# josephkotzker.com

Source for https://josephkotzker.com, built with [Astro](https://astro.build) and deployed to GitHub Pages by GitHub Actions.

## Prerequisites

Node.js at the version in `.nvmrc` (for example `nvm use`). Install dependencies with `npm ci`.

## Commands

- `npm run dev` starts the local dev server.
- `npm run build` builds the site into `dist/`.
- `npm test` runs the Vitest suite.
- `npm run ci` runs type checking (`astro check`), tests, the build, and the post-build checks. This is the single gate CI runs, so a passing `npm run ci` locally means the same checks will pass in CI.

## Content

Posts live in `src/content/posts/` as Markdown with front matter: `title`, `description`, `pubDate`, and optionally `updatedDate`, `tags`, and `draft`. Posts with `draft: true` are excluded from production builds. This repository is public, so anything committed to it is visible regardless of its draft status; keep unready drafts uncommitted or on a branch.

Projects and podcasts are curated YAML in `src/data/` (`projects.yaml`, `podcasts.yaml`). At build time they are enriched from the GitHub API (repository metadata) and from podcast RSS feeds (latest episode). If a fetch fails, the page falls back to the curated fields.

## Resume

CI checks out a private repository into `.resume/` (git-ignored) using the read-only deploy key stored in the `RESUME_DEPLOY_KEY` secret. The `/resume` page renders the content only when the front matter of `.resume/resume.md` has `public: true`; otherwise it shows a "coming soon" placeholder, which is marked `noindex`.

## Workflows

- `.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`, daily on a schedule (to refresh enrichment and pick up resume changes), and on manual dispatch.
- `.github/workflows/ci.yml` runs `npm run ci` on pull requests.

GitHub disables scheduled workflows in public repositories after 60 days without repository activity. After a quiet stretch, re-enable the daily run from the Actions tab or trigger the deploy workflow manually.

## Scripts

`scripts/` holds the post-build checks that run as part of `npm run ci`: `verify-dist.mjs` validates the built output, and `check-links.mjs` fails on any internal link that points at a file missing from `dist/`.
