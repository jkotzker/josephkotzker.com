# Design direction — josephkotzker.com

Working record for Part 2 (visual direction) of the personal-website rebuild. The site replaces `linktr.ee/kotzker` with: headshot and short bio, social links, podcasts, software projects, a small blog with RSS, and a resume. Process: the `design-direction` skill — seed → explore → fork → playground → critique → converge.

## What the site is (inputs to the concept seeds)

- **Who:** Joseph Kotzker, software engineer.
- **Podcast:** *In Reverse* (inreversecast.com), co-hosted with Zach Kotzker — watching the Fast & Furious franchise for the first time in reverse chronological order.
- **Links carried over from the Linktree:** In Reverse, Instagram, Bluesky, Mastodon (hachyderm.io), Discord, Spotify, Trakt.tv, LinkedIn, GitHub, resume.
- **Software:** GitHub `jkotzker`; personal tooling (Alfred workflows, Homebrew cask work, Claude Code setup, homelab).
- **Tone references:** `references.md` — simple, clean, evident taste; the indie Apple-developer and writer web.

## Concept seeds (2026-10-01)

Each is a concept for the whole site, not a style. One gets explored; the others stay here in case the first is rejected.

1. **The writer's page.** Derived from the reference list itself — marco.org, Daring Fireball, Hypercritical, rambo.codes are text-first sites where typography, measure and restraint *are* the identity. The concept is a site that reads like a well-set document by one person. Safest seed; the risk is landing on generic.
2. **In Reverse.** Derived from the podcast's premise: experience things backwards. The site starts at the end — newest first taken literally as a motif: rewind controls, reversed timelines, a film-strip or tape-deck mechanic, end credits at the top. The closest analogue to the source post's "rails + fun = rollercoaster" move.
3. **Ship's log.** Derived from personal naming habits recorded in Claude's memory, not from anything on the current site: backup drives named after fictional vessels (*Serenity*, *Prometheus*, *TARDIS*), a HAL 9000 session greeting, a Cosmere-derived Discord handle. The site as a vessel's log or ship's-computer console — entries, systems, crew manifest. Veto freely if this is private taste rather than public persona.
4. **The man page.** Derived from the software side — CLI tooling, dotfiles, Alfred workflows. The site as a beautifully typeset manual page or README: `NAME`, `SYNOPSIS`, `SEE ALSO` as the section structure, monospace used with care rather than as costume.

## Chosen direction

**Adopted: `forks/031-light-contrast-aa.html`** (Joseph, 2026-10-01). Concept 1, the writer's page, at the restrained end of the spectrum: a single centred 34rem column in the system serif, a quiet fixed sidebar of outline-icon section links and "Elsewhere" links beside it, a round headshot above the name, a neutral light-grey page (`#ebebeb`) with a blue link (`#1f63dc`), and a warm-dark scheme (`#22211e`) with a cyan link (`#00c7fc`). Values live in `tokens.css`; lineage 001 → 011 → 012 → 017 → 018 → 019 → 023 → 028 → 029 → 030 → 031.

Not yet designed: every page other than the home page (blog index, post, projects, podcasts, résumé, 404) and the real headshot. Those are generated against `tokens.css` and the anchor below.

### Explore round 1 — spectrum (2026-10-01)

Six home-page hero variants, minimal → outlandish. 001–003 guided (the reference board's "simple, clean, evident taste"); 004–006 unguided ("go wild" within the concept).

1. **001** — bare text: one column, system serif, no image, links inline in prose.
2. **002** — the blog with a rail: narrow left rail of name and sections, a reading column beside it.
3. **003** — editorial: large display serif name, small-caps section labels, a typographic hierarchy doing all the work.
4. **004** — broadsheet: the home page as a newspaper front page — masthead, rules, columns, datelines.
5. **005** — manuscript: a typed letter on paper, with handwritten marginalia and a signature.
6. **006** — poster: the bio as one oversized running sentence with every section and link embedded in it.

## Anchor asset

**The sidebar nav in `forks/031-light-contrast-aa.html`** (`nav.side`; Joseph's choice, 2026-10-01). What defines its style: set entirely in the muted text colour at `--text-nav` with `--leading-nav` spacing, so it navigates without competing with the reading column; every entry is a 1em, 2px-stroke outline icon (Lucide for sections, Tabler for brands) followed by a plain label; one small uppercase group label; hover goes to full text colour, never to an accent. Generate later navigation and link lists "in the same style as the sidebar nav in forks/031".

## Decision log

- **2026-10-01** — Workspace seeded. Four concept candidates written above; awaiting Joseph's choice before any prototype is generated.
- **2026-10-01** — Joseph chose seed 1, the writer's page. Explore round 1 generated (001–006, spectrum above). Copy in the prototypes is factual where known (name, In Reverse, the Linktree links) and visibly sample elsewhere (post titles, project entries); real copy is Part 3.
- **2026-10-01** — Round 1 verdict (Joseph): 001 and 002 are the best; 002 edges out 001. Wants variants of both, playing with colour scheme, typography and layout. Specifics: the main body should not sit all the way to one side as in 002; sidebar navigation is preferred over 001's plain vertical sections; the simpler typefaces of 001 and 002 are liked; 001's colour scheme is liked. Round 1 lands at the restrained end of the spectrum. 003–006 left `active` (not marked dead-end — Joseph's call).
- **2026-10-01** — Fork round 1 (007–012), one change each:
  - 002 line: 007 centres rail + column as one unit → 008 applies 001's palette → 009 swaps the reading face for 001's system serif / 010 swaps everything to the system sans (typography alternatives, siblings).
  - 001 line: 011 adds a sticky sidebar nav beside the still-centred column → 012 moves the inline social links out of the bio prose into the sidebar.
- **2026-10-01** — Fork round 1 verdict (Joseph): favourites are **009** and **012**. For the sidebar lineage: the sidebar a little further to the side and the main body more centred — wants several versions varying sidebar placement and line width. For 012: try a headshot and some iconography — "it doesn't need to be pure text", e.g. social icons instead of the text links. Palette: "keep to this cool color palette, with the blues and the grays", with some variation to explore, and "maybe throw a little red or pink in there too".
- **2026-10-01** — Fork round 2 (013–022), one change each:
  - 009 line, layout: 013 rail fixed near the window's left edge with the reading column centred in the window (40rem measure) → 014 narrower measure (34rem) / 015 wider measure (46rem), siblings; 016 (from 013) rail hugging the left side of the centred column instead of the window edge.
  - 012 line, imagery: 017 adds a headshot (placeholder — no photo supplied yet) → 018 replaces the "Elsewhere" text links with brand icons (Simple Icons 16.33.0, CC0) → 019 adds line icons to the section nav (Lucide 1.49.0, ISC).
  - Palette, siblings from 018: 020 slate + rose, 021 ink navy + signal red, 022 cool grey + dusty pink. Each introduces a second, warm accent used only for hover and current-item states.
- **2026-10-01** — Fork round 2 verdict (Joseph): "019 is getting there"; stick with roughly its colour scheme (001's palette — 020–022 not chosen). Fork round 3 from 019: **023** Elsewhere links as icon + text like the nav; **024** social icons moved out of the sidebar into a final Elsewhere section below Projects, above the footer.
- **2026-10-01** — Joseph chose **023** to proceed with. Correction to 019/023/024: the Lucide "mic" icon had lost its `width`/`height` (a generation-helper bug stripped them from every element, not just `<svg>`), so the Podcast icon rendered without its body; restored in all three. Critic pass on 023 written to `critiques/001-023.md`.
- **2026-10-01** — Joseph's calls on the critique: address the **icon style clash** and do the **accessibility pass** before adoption; leave the warm-vs-cool greys as an observation. Anchor (to be recorded at convergence): **the sidebar nav**. Joseph asked for a playground off 023 before adopting anything.
  - `playgrounds/023-tune.html` — 023's page with colour (light and dark, plus a sidebar-hover accent), type (body and sidebar font from a ten-face list, sizes, line heights, label opacity) and layout (line width, sidebar gap/width/top, sidebar beside the column or at the window edge, headshot size). Defaults verified identical to 023 (nine elements, position/size/font/colour, zero differences); controls, persistence and reset verified in the in-app browser over a localhost server.
  - Icon-clash options, siblings from 023: **025** outline brand icons (Tabler 3.48.0; Trakt falls back to a generic "movie" outline — Tabler has no Trakt mark) / **026** filled section icons (Phosphor 2.1.1 fill weight).
  - **027** accessibility pass from 023: focus-visible outline, 40px sidebar rows, scrollable sidebar on short windows, full-contrast "Elsewhere" label. Verified in the browser: rows 40px, focus ring on Tab, link positions unchanged.
- **2026-10-01** — Joseph tuned `playgrounds/023-tune.html` and pasted the block; applied verbatim as **028** (from 023). Changes: dark muted/link/rules → `#929292` / `#00c7fc` / `#494949`; body 1.15rem at 1.65; section heads 1.075rem; sidebar line height 2; sidebar gap 2.25rem, width 7.25rem. Light colours and fonts unchanged.
- **2026-10-01** — Joseph: keep his tighter sidebar line spacing (not 027's 40px rows) and take 025's outline icons. Merge fork **029** = 028 + 025's Tabler outline brand icons + 027's focus outline, scrollable sidebar and full-contrast label. Verified in the browser against 028: identical geometry for the sidebar links, h1, bio, section heads and footer; all 11 sidebar icons outline; label opacity 1; sidebar scrolls. Accepted trade-off: sidebar targets ~30px.
- **2026-10-01** — Joseph: "029 is great", but light mode not yet reviewed. Built `playgrounds/029-tune.html` from 029 (same controls as 023-tune; opens in the light scheme). Verified in the browser: with the scheme set to match, 11 measurements (geometry, type, colour, opacity, overflow, background) identical to 029.
- **2026-10-01** — Joseph tuned colours in the 029 playground; applied as **030** (from 029). Light: bg `#ebebeb`, text `#131211`, muted `#77716d`, link `#286be1`, rules `#cccbc4`; dark bg `#22211e`. Contrast on the new light background falls below WCAG AA 4.5:1 for muted text (4.0) and links (4.1); nearest same-hue passing values computed: muted `#6f6966` (4.53), link `#1f63dc` (4.54). Awaiting Joseph's call.
- **2026-10-01** — Joseph: apply the passing values. **031** (from 030) changes only light muted → `#6f6966` and light link → `#1f63dc`; diff against 030 outside the metadata is that one line. All running text in both schemes now meets WCAG AA.
- **2026-10-01** — **Converged on 031** (Joseph: "let's adopt 031"). 031 set to `status: adopted` (no other prototype was adopted). Values extracted by role into `tokens.css` (colour ×5 per scheme, type, layout, space, lines/focus/shapes/icons); 031 rewritten to link `../tokens.css` and use only `var()`s. Verification: (1) no colour or font literal left in 031's styles — a search for hex/rgb/hsl/oklch/font names returns nothing, while the same search on the pre-rewrite copy finds 3 lines; (2) rendered identically — computed layout and style of all 56 elements (41 properties each) captured before the rewrite and compared after, in both schemes at 1059px and 700px wide: 0 differences in all four cases (control: dark vs light baseline differs in 170 values). `tokens.css` is not git-ignored. Anchor recorded above.
