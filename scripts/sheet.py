# Contact sheet from a folder of harness shots (the harness needs a full ffmpeg
# build for its own sheet, which this machine does not have).
import sys, glob, os
from PIL import Image, ImageDraw
folder = sys.argv[1]; cols = int(sys.argv[2]) if len(sys.argv) > 2 else 4
files = sorted(glob.glob(os.path.join(folder, '[0-9]*.png')))
ims = [Image.open(f).convert('RGB') for f in files]
tw = 480 if ims[0].width > ims[0].height else 240
th = round(ims[0].height * tw / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + 8) + 8, rows * (th + 26) + 8), (30, 30, 30))
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    im.thumbnail((tw, th))
    x = 8 + (i % cols) * (tw + 8); y = 8 + (i // cols) * (th + 26)
    sheet.paste(im, (x, y + 18)); d.text((x, y + 2), os.path.basename(f), fill=(255, 220, 0))
out = os.path.join(folder, 'sheet.jpg'); sheet.save(out, quality=82); print(out, sheet.size)
