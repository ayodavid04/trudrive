# Builds site/img from the TikTok pulls: named, resized WebP (plus a JPEG
# fallback), the logo with its white removed, and the share image.
# Stand-ins until Gaz sends his originals; rerun with the new files.
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter

SRC = Path('src/tiktok')
OUT = Path('site/img')
OUT.mkdir(parents=True, exist_ok=True)

# name -> (source file, focal point x%, y%)
PICK = {
    'j1-before':  ('7599984407696428310-01.jpg', 50, 55),
    'j1-after':   ('7599984407696428310-03.jpg', 50, 55),
    'j1-house':   ('7599984407696428310-02.jpg', 50, 55),
    'j1-fence':   ('7599984407696428310-05.jpg', 50, 55),
    'j2-before':  ('7670973537603063042-01.jpg', 45, 50),
    'j2-rip':     ('7670973537603063042-02.jpg', 50, 55),
    'j2-weeds':   ('7670973537603063042-03.jpg', 50, 60),
    'j2-after':   ('7670973537603063042-04.jpg', 50, 55),
    'j2-path':    ('7670973537603063042-05.jpg', 50, 50),
    'j3-before':  ('7558941538148093206-03.jpg', 50, 60),
    'j3-hottub':  ('7558941538148093206-02.jpg', 50, 55),
    'j3-after':   ('7558941538148093206-05.jpg', 50, 55),
    'j3-garden':  ('7558941538148093206-06.jpg', 50, 55),
    'j4-front':   ('7524458162640997654-02.jpg', 50, 55),
    'j4-pergola': ('7524458162640997654-04.jpg', 50, 60),
    'j4-border':  ('7524458162640997654-05.jpg', 50, 60),
    'j5-patio':   ('7536519404712906006-01.jpg', 50, 55),
    'j5-bed':     ('7536519404712906006-05.jpg', 50, 55),
    'j6-wide':    ('7598588934813175062-01.jpg', 50, 55),
    'j6-shed':    ('7598588934813175062-02.jpg', 50, 55),
    'j6-path':    ('7598588934813175062-03.jpg', 50, 55),
    'j6-lawn':    ('7598588934813175062-04.jpg', 50, 55),
    'j6-steps':   ('7598588934813175062-05.jpg', 50, 55),
    'j7-drive':   ('7641929953017089302-02.jpg', 50, 55),
    'j7-front':   ('7641929953017089302-04.jpg', 50, 55),
    'j7-side':    ('7641929953017089302-01.jpg', 50, 60),
    'j9-block':   ('7558941538148093206-08.jpg', 50, 60),
}

manifest = {}
for name, (fname, fx, fy) in PICK.items():
    im = ImageOps.exif_transpose(Image.open(SRC / fname)).convert('RGB')
    w, h = im.size
    # Phone photos, TikTok-compressed: past 1600 px there is nothing more to show.
    widths = [480, 800, 1200, 1600]
    out = []
    for tw in widths:
        if tw > w: continue
        r = im.resize((tw, round(h * tw / w)), Image.LANCZOS)
        dest = OUT / f'{name}-{tw}.webp'
        r.save(dest, 'WEBP', quality=62 if tw >= 1200 else 68, method=6)
        # Foliage is all fine detail and TikTok's own compression noise. A
        # light smooth is invisible at display size and cuts these by ~40%.
        if tw >= 1200 and dest.stat().st_size > 280 * 1024:
            r.filter(ImageFilter.GaussianBlur(0.6)).save(dest, 'WEBP', quality=60, method=6)
        out.append(tw)
    fb = im.resize((1200, round(h * 1200 / w)), Image.LANCZOS) if w > 1200 else im
    fb.save(OUT / f'{name}.jpg', 'JPEG', quality=74, optimize=True, progressive=True)
    manifest[name] = {'w': w, 'h': h, 'widths': out, 'focus': f'{fx}% {fy}%'}

(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))

# Logo and share image: scripts/logo.py and scripts/og.py.

total = sum(p.stat().st_size for p in OUT.iterdir())
print(f'{len(manifest)} photos, {len(list(OUT.iterdir()))} files, {total/1024/1024:.1f} MB total on disk')
