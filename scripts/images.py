# Builds site/img from the photos in src/: named, resized WebP (plus a JPEG
# fallback). tiktok/ is what was pulled from his TikTok for the demo; gaz/ is
# what he sent himself on 14 Oct 2026, used wherever it is the better copy.
# The logo and share image are scripts/logo.py and scripts/og.py.
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter

SRC = Path('src')
OUT = Path('site/img')
OUT.mkdir(parents=True, exist_ok=True)

# name -> (source file, focal point x%, y%)
PICK = {
    # Only what the pages use: j1 is the home hero if every job is deleted.
    'j1-before':  ('tiktok/7599984407696428310-01.jpg', 50, 55),
    'j1-after':   ('tiktok/7599984407696428310-03.jpg', 50, 55),
    'j6-path':    ('tiktok/7598588934813175062-03.jpg', 50, 55),
    'j6-lawn':    ('tiktok/7598588934813175062-04.jpg', 50, 55),
    'j6-steps':   ('tiktok/7598588934813175062-05.jpg', 50, 55),
    # From Gaz, 14 Oct 2026
    'g1-drive':   ('gaz/drive-block.jpg', 50, 55),
    'g2-patio':   ('gaz/patio-sleepers.jpg', 50, 60),
    'g3-patio':   ('gaz/patio-sleepers-2.jpg', 50, 55),
    'g4-path':    ('gaz/path-drainage.jpg', 50, 50),
    'g5-fence':   ('gaz/fence-composite.jpg', 50, 60),
    'g6-turf':    ('gaz/turf-new-build.jpg', 50, 65),
    'g7-front':   ('gaz/front-bungalow.jpg', 50, 55),
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
