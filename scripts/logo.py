# Logo cut from Gaz's TikTok profile picture (lab/logo-crop.png, a crop of his
# avatar). White keyed to transparent. On dark grounds the pages sit it on a
# light plate rather than recolouring it, because the T overlaps the emblem ring.
from PIL import Image

src = Image.open('lab/logo-crop.png').convert('RGB')
px = src.load()
W, H = src.size

# His white avatar circle, in crop coordinates. Outside it is the black of the
# TikTok page, which has to go.
AV_CX, AV_CY, AV_R = 474, 207, 478
# The emblem ring, measured: top 27, bottom 371, left edge 36 on the centre row.
EM_CX, EM_CY, EM_R = 208, 199, 172
BOX = (30, 20, 890, 395)

out = Image.new('RGBA', (W, H))
o = out.load()
for y in range(H):
    for x in range(W):
        if (x - AV_CX) ** 2 + (y - AV_CY) ** 2 > AV_R ** 2:
            continue
        r, g, b = px[x, y]
        lum = min(r, g, b)
        a = 255 if lum < 170 else max(0, int((255 - lum) * 255 / 85))
        o[x, y] = (r, g, b, a)
logo = out.crop(BOX)
logo.save('site/img/logo.png', optimize=True)

# Emblem as a white disc for the favicon; the T that pokes into the ring is
# painted out.
disc = Image.new('RGBA', (W, H))
d = disc.load()
for y in range(H):
    for x in range(W):
        if (x - EM_CX) ** 2 + (y - EM_CY) ** 2 <= (EM_R + 1) ** 2:
            r, g, b = px[x, y]
            if x > 292 and 138 < y < 286 and not (b > r + 30):
                r, g, b = 255, 255, 255
            d[x, y] = (r, g, b, 255)
em = disc.crop((EM_CX - EM_R - 2, EM_CY - EM_R - 2, EM_CX + EM_R + 3, EM_CY + EM_R + 3))
em.save('site/img/emblem.png', optimize=True)
em.resize((64, 64), Image.LANCZOS).save('site/img/favicon.png')
em.resize((180, 180), Image.LANCZOS).save('site/img/apple-touch-icon.png')
print('logo', logo.size, 'emblem', em.size)
