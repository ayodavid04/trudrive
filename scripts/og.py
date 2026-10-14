# Share image (1200x630 JPEG: WhatsApp and LinkedIn do not read WebP): the
# block paved drive Gaz sent, with the logo on a plate in the corner.
from PIL import Image, ImageOps
hero = ImageOps.exif_transpose(Image.open('src/gaz/drive-block.jpg')).convert('RGB')
hero = ImageOps.fit(hero, (1200, 630), Image.LANCZOS, centering=(0.5, 0.55))
logo = Image.open('site/img/logo.png')
plate = Image.new('RGB', (470, 150), (243, 241, 236))
lg = logo.copy(); lg.thumbnail((410, 120), Image.LANCZOS)
plate.paste(lg, ((470 - lg.width) // 2, (150 - lg.height) // 2), lg)
hero.paste(plate, (40, 630 - 150 - 40))
hero.save('site/img/og.jpg', 'JPEG', quality=84, optimize=True, progressive=True)
print('og.jpg', hero.size)
