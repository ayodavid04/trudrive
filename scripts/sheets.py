# Contact sheet per post so pairs can be picked by eye.
import json, os
from PIL import Image, ImageDraw
d = 'src/tiktok'
files = json.load(open(f'{d}/manifest.json'))['files']
posts = {}
for f in files: posts.setdefault(f['f'].split('-')[0], []).append(f['f'])
for pid, names in posts.items():
    th = 360
    ims = []
    for n in names:
        im = Image.open(f'{d}/{n}').convert('RGB')
        im.thumbnail((th*2, th))
        ims.append((n, im))
    W = sum(i.width for _, i in ims) + 10*(len(ims)+1)
    sheet = Image.new('RGB', (W, th+40), (30,30,30))
    x = 10
    dr = ImageDraw.Draw(sheet)
    for n, im in ims:
        sheet.paste(im, (x, 30))
        dr.text((x+4, 8), n.split('-',1)[1] + f'  {Image.open(f"{d}/{n}").size}', fill=(255,255,0))
        x += im.width + 10
    sheet.save(f'lab/sheet-{pid}.jpg', quality=80)
print('ok', len(posts))
