#!/usr/bin/env python3
# Regenerates public/favicon.svg (design/explore/061). Needs fonttools and uharfbuzz, which are not
# site dependencies:
#   python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools uharfbuzz
#   curl -sSLo /tmp/ss4-700.woff https://cdn.jsdelivr.net/fontsource/fonts/source-serif-4@latest/latin-700-normal.woff
#   /tmp/fontenv/bin/python scripts/make-favicon.py /tmp/ss4-700.woff public/favicon.svg design/tokens.css
# Then rasterise: rsvg-convert for public/apple-touch-icon.png (180px, square corners) and the
# 16/32/48px layers of public/favicon.ico (ImageMagick).
"""Builds public/favicon.svg from adopted prototype design/explore/061: "JK" in Source Serif 4 Bold,
link colour on the page background, outlined to paths (an SVG favicon cannot load web fonts).
Geometry mirrors the prototype's <text x="16" y="23" text-anchor="middle" font-size="19"
letter-spacing="-1">, shaped with HarfBuzz so kerning matches the browser."""
import io, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

src, out, tokens = sys.argv[1], sys.argv[2], sys.argv[3]
import re
css = open(tokens).read(); dark_at = css.index('@media (prefers-color-scheme: dark)')
tok = lambda block, n: re.search(rf'--color-{n}:\s*(#[0-9a-fA-F]{{3,8}})\s*;', block).group(1)
L = {n: tok(css[:dark_at], n) for n in ('bg', 'link')}; D = {n: tok(css[dark_at:], n) for n in ('bg', 'link')}
font = TTFont(src)
font.flavor = None
buf = io.BytesIO(); font.save(buf); data = buf.getvalue()

SIZE, BASELINE, CENTER, TRACK, TEXT = 19.0, 23.0, 16.0, -1.0, 'JK'
upem = font['head'].unitsPerEm
scale = SIZE / upem

hbfont = hb.Font(hb.Face(data))
b = hb.Buffer(); b.add_str(TEXT); b.guess_segment_properties()
hb.shape(hbfont, b, {'kern': True, 'liga': True})
advances = [p.x_advance * scale + TRACK for p in b.glyph_positions]
x = CENTER - sum(advances) / 2

glyphs = font.getGlyphSet()
paths = []
for info, pos, adv in zip(b.glyph_infos, b.glyph_positions, advances):
    pen = SVGPathPen(glyphs, ntos=lambda v: f'{v:.2f}'.rstrip('0').rstrip('.'))
    gx, gy = x + pos.x_offset * scale, BASELINE - pos.y_offset * scale
    glyphs[font.getGlyphName(info.codepoint)].draw(TransformPen(pen, (scale, 0, 0, -scale, gx, gy)))
    paths.append(pen.getCommands())
    x += adv

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<!-- josephkotzker.com favicon: design/explore/061 ("JK", Source Serif 4 Bold, OFL-1.1, outlined).
     Colours are design/tokens.css: link on page background, light and dark. Regenerate, do not edit. -->
<style>.bg{{fill:{L['bg']}}}.fg{{fill:{L['link']}}}@media (prefers-color-scheme:dark){{.bg{{fill:{D['bg']}}}.fg{{fill:{D['link']}}}}}</style>
<rect class="bg" width="32" height="32" rx="3"/>
<path class="fg" d="{' '.join(paths)}"/>
</svg>
'''
open(out, 'w').write(svg)
print('upem', upem, 'glyphs', [font.getGlyphName(i.codepoint) for i in b.glyph_infos],
      'advances', [round(a, 2) for a in advances], 'bytes', len(svg))
