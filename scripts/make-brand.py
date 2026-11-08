"""Builds the GearScript brand files from geometry: a silver gear whose ring opens into a gold G.

The mark is drawn in a unit space (tooth tips at radius 1, y up) and written as SVG. The 3D look of the
supplied artwork is kept with an extrusion made of offset copies of one shape: grey where the walls are
the outside of the teeth, gold inside the root circle (the inner walls of the G). The wordmark is Inter SemiBold, as outlines.
Run: python3 scripts/make-brand.py OUT_DIR FONTS_DIR  (needs fonttools, brotli, shapely); PNGs are rendered from the SVGs.
"""
import math, sys, os
from shapely.geometry import Polygon, Point, box
from shapely.ops import unary_union
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = sys.argv[1] if len(sys.argv) > 1 else 'out'
FONTS = sys.argv[2] if len(sys.argv) > 2 else '/tmp/font/package/files'   # the woff2 files of @fontsource/inter (npm pack @fontsource/inter)
os.makedirs(OUT, exist_ok=True)

# ---------- geometry (unit space) ----------
RT, RR = 1.0, 0.87           # tooth tip and root radius
RG = 0.64                    # the hole of the G
CUT = math.radians(45)       # where the G's top ends
BAR_T, BAR_B, BAR_L = 0.115, -0.055, 0.11   # crossbar top, bottom, left end
EXT = (0.075, -0.085)        # extrusion: down and to the right


def gear(n, tip_frac=0.2, base_frac=0.3, step=0.3):
    p = 2 * math.pi / n
    pts = []
    for k in range(int(360 / step)):
        a = math.radians(k * step)
        d = (a - math.pi / 2) % p
        d = min(d, p - d)                      # distance to the nearest tooth centre (a tooth sits at the top)
        ht, hb = tip_frac * p, base_frac * p
        r = RT if d <= ht else RR if d >= hb else RT - (RT - RR) * (d - ht) / (hb - ht)
        pts.append((r * math.cos(a), r * math.sin(a)))
    return Polygon(pts)


def body(n):
    g = gear(n).difference(Point(0, 0).buffer(RG, 256))
    # the opening: above the bar line, below the 45 degree cut
    opening = Polygon([(0, 0), (3 * math.cos(CUT), 3 * math.sin(CUT)), (3, 3 * math.sin(CUT)), (3, BAR_T), (BAR_T / math.tan(CUT), BAR_T)])
    g = g.difference(opening)
    h = (BAR_T - BAR_B) / 2
    bar = unary_union([box(BAR_L + h, BAR_B, 0.97, BAR_T), Point(BAR_L + h, (BAR_T + BAR_B) / 2).buffer(h, 64)])
    shape = unary_union([g, bar.intersection(gear(n).buffer(0))])
    return shape.simplify(0.0006, preserve_topology=True)


def rim():
    """the gold edge along the inside of the G, in unit space, as a list of points"""
    pts = [(0.85 * math.cos(CUT), 0.85 * math.sin(CUT)), (RG * math.cos(CUT), RG * math.sin(CUT))]
    a_end = 2 * math.pi + math.asin(BAR_B / RG)          # where the circle meets the bar's bottom
    a = CUT
    while a < a_end:
        pts.append((RG * math.cos(a), RG * math.sin(a))); a += math.radians(1.5)
    pts.append((math.sqrt(RG * RG - BAR_B * BAR_B), BAR_B))
    h = (BAR_T - BAR_B) / 2; cx, cy = BAR_L + h, (BAR_T + BAR_B) / 2
    pts.append((cx, BAR_B))
    for k in range(1, 24):
        t = -math.pi / 2 - math.pi * k / 24
        pts.append((cx + h * math.cos(t), cy + h * math.sin(t)))
    pts.append((cx, BAR_T)); pts.append((0.86, BAR_T))
    return pts


def to_svg_pts(pts, cx, cy, s):
    return [(cx + s * x, cy - s * y) for x, y in pts]


def path_d(pts, close=True):
    d = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts)
    return d + (' Z' if close else '')


def mark_svg(size=512, n=20, extrude=True, detail=True, uid='g', tile=None, scale=0.43):
    """the mark in a size x size box. tile: None (transparent), 'round' (app icon), 'full' (maskable, edge to edge)"""
    cx, cy, s = size * 0.49, size * 0.505, size * scale
    if tile == 'mask': s = size * 0.33
    shp = body(n)
    d_body = path_d(to_svg_pts(list(shp.exterior.coords), cx, cy, s))
    d_rim = path_d(to_svg_pts(rim(), cx, cy, s), close=False)
    ex, ey = EXT[0] * s, -EXT[1] * s
    sw = max(1.0, size / 512 * 2.2)
    defs = f'''<linearGradient id="{uid}s" x1="0.15" y1="0.1" x2="0.85" y2="0.95"><stop offset="0" stop-color="#f6f7f9"/><stop offset="0.45" stop-color="#d8dce2"/><stop offset="1" stop-color="#7c828a"/></linearGradient>
<linearGradient id="{uid}w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5f656e"/><stop offset="1" stop-color="#2c3037"/></linearGradient>
<linearGradient id="{uid}a" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#ffe382"/><stop offset="0.5" stop-color="#f0bd36"/><stop offset="1" stop-color="#d99a1c"/></linearGradient>
<linearGradient id="{uid}d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2b631"/><stop offset="1" stop-color="#b97a0d"/></linearGradient>
<clipPath id="{uid}c"><circle cx="{cx:.1f}" cy="{cy:.1f}" r="{RR * s * 0.985:.1f}"/></clipPath>
<path id="{uid}b" d="{d_body}"/>'''
    bg = ''
    if tile:
        defs += f'''<radialGradient id="{uid}t" cx="0.45" cy="0.4" r="0.75"><stop offset="0" stop-color="#232833"/><stop offset="1" stop-color="#0b0d12"/></radialGradient>'''
        bg = f'<rect width="{size}" height="{size}" rx="{0 if tile == "mask" else size * 0.22:.1f}" fill="url(#{uid}t)"/>'
    layers = []
    if extrude:
        k = 10 if detail else 3
        steps = [(ex * i / k, ey * i / k) for i in range(k, 0, -1)]
        layers.append('<g fill="url(#%sw)">' % uid + ''.join(f'<use href="#{uid}b" x="{x:.2f}" y="{y:.2f}"/>' for x, y in steps) + '</g>')
        layers.append(f'<g fill="url(#{uid}d)" clip-path="url(#{uid}c)">' + ''.join(f'<use href="#{uid}b" x="{x:.2f}" y="{y:.2f}"/>' for x, y in steps) + '</g>')
    layers.append(f'<use href="#{uid}b" fill="url(#{uid}s)" stroke="#fbfcfd" stroke-opacity="{0.85 if detail else 0}" stroke-width="{sw * 0.6:.2f}" stroke-linejoin="round"/>')
    layers.append(f'<path d="{d_rim}" fill="none" stroke="url(#{uid}a)" stroke-width="{s * (0.034 if detail else 0.06):.2f}" stroke-linejoin="round" stroke-linecap="round"/>')
    if detail:
        layers.append(f'<path d="{d_rim}" fill="none" stroke="#fff6cf" stroke-opacity="0.75" stroke-width="{sw * 0.45:.2f}" stroke-linejoin="round"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}"><defs>{defs}</defs>{bg}{"".join(layers)}</svg>'


# ---------- wordmark (Inter SemiBold, as outlines) ----------
FONT = TTFont(os.path.join(FONTS, 'inter-latin-600-normal.woff2'))
GSET, CMAP, HMTX = FONT.getGlyphSet(), FONT.getBestCmap(), FONT['hmtx']
UPM = FONT['head'].unitsPerEm


def word_paths(text, size, x0, base, tracking=-0.012):
    """one path per letter run: returns ([(d, letter)], width)"""
    sc = size / UPM; x = x0; out = []
    for ch in text:
        gname = CMAP[ord(ch)]
        pen = SVGPathPen(GSET)
        GSET[gname].draw(TransformPen(pen, (sc, 0, 0, -sc, x, base)))
        out.append((pen.getCommands(), ch))
        x += HMTX[gname][0] * sc + tracking * size
    return out, x - x0


def logo_svg(dark):
    H = 160; mark = 160
    m = mark_svg(512, uid='m' + ('d' if dark else 'l'))
    inner = m[m.index('>') + 1: m.rindex('</svg>')]
    size = 82; gap = 26
    letters, w = word_paths('GearScript', size, mark + gap, H * 0.5 + size * 0.36)
    gear_c, script_c = ('#eef1f5', '#f2bd3d') if dark else ('#151922', '#b37a07')
    d1 = ''.join(d for d, ch in letters[:4]); d2 = ''.join(d for d, ch in letters[4:])
    W = int(mark + gap + w + 18)
    bg = f'<rect width="{W}" height="{H}" fill="#0d1016"/>' if dark else ''
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><title>GearScript</title>{bg}<svg x="0" y="0" width="{mark}" height="{mark}" viewBox="0 0 512 512">{inner}</svg><path d="{d1}" fill="{gear_c}"/><path d="{d2}" fill="{script_c}"/></svg>'''


def write(name, s):
    open(os.path.join(OUT, name), 'w').write(s)


write('logo-mark.svg', mark_svg(512, uid='k'))
write('logo-mark-small.svg', mark_svg(64, n=14, extrude=True, detail=False, uid='q', scale=0.43))
write('app-icon.svg', mark_svg(512, uid='t', tile='round', scale=0.34))
write('app-maskable.svg', mark_svg(512, uid='u', tile='mask'))
write('logo.svg', logo_svg(False))
write('logo-dark.svg', logo_svg(True))
print('ok', os.listdir(OUT))


# ---------- social preview (GitHub: 1280 x 640) ----------
def social_svg():
    W, H = 1280, 640
    m = mark_svg(512, uid='sc')
    inner = m[m.index('>') + 1: m.rindex('</svg>')]
    letters, w = word_paths('GearScript', 112, 520, 300)
    d1 = ''.join(d for d, ch in letters[:4]); d2 = ''.join(d for d, ch in letters[4:])
    global FONT, GSET, CMAP, HMTX
    keep = (FONT, GSET, CMAP, HMTX)
    FONT = TTFont(os.path.join(FONTS, 'inter-latin-400-normal.woff2')); GSET, CMAP, HMTX = FONT.getGlyphSet(), FONT.getBestCmap(), FONT['hmtx']
    t1, _ = word_paths('Describe mechanisms in a CSS-like language.', 31, 524, 380, 0)
    t2, _ = word_paths('Watch them move.', 31, 524, 424, 0)
    FONT, GSET, CMAP, HMTX = keep
    tag = ''.join(d for d, ch in t1 + t2)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs><radialGradient id="sbg" cx="0.3" cy="0.45" r="0.9"><stop offset="0" stop-color="#1e232d"/><stop offset="1" stop-color="#090b0f"/></radialGradient></defs><rect width="{W}" height="{H}" fill="url(#sbg)"/><svg x="70" y="110" width="420" height="420" viewBox="0 0 512 512">{inner}</svg><path d="{d1}" fill="#eef1f5"/><path d="{d2}" fill="#f2bd3d"/><path d="{tag}" fill="#9aa3b2"/></svg>'''


write('social.svg', social_svg())
