// Print-ready QR codes for cards, flyers and the van.
//
//   node scripts/qr.mjs https://trudrive.co.uk          writes qr/
//   node scripts/qr.mjs https://trudrive.co.uk --out x  writes x/
//
// Each code holds a short address on his own domain, never a Google link, so
// nothing printed goes stale: /review follows whatever review link is in his
// editor (Business details, Google reviews links) and /quote opens the quote
// page. Both are set in site/_redirects by scripts/build.mjs.
//
// Makes review.svg and quote.svg (any size, for printers) and 1600 px PNGs.
// Scan both with a phone before anything is printed.
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const site = (argv.find((a) => /^https:\/\//.test(a)) || process.env.SITE_URL || '').replace(/\/$/, '');
const out = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'qr';
if (!/^https:\/\/[^/]+$/.test(site) || /localhost|pages\.dev/.test(site)) {
  console.error('Give his real domain, like: node scripts/qr.mjs https://trudrive.co.uk');
  process.exit(1);
}

fs.mkdirSync(out, { recursive: true });
// Q keeps the code readable with a quarter of it scuffed or dirty. Four
// modules of white around it is the margin scanners need.
const opts = { errorCorrectionLevel: 'Q', margin: 4, color: { dark: '#111111', light: '#ffffff' } };
for (const name of ['review', 'quote']) {
  const url = `${site}/${name}`;
  const svg = await QRCode.toString(url, { ...opts, type: 'svg' });
  fs.writeFileSync(path.join(out, `${name}.svg`), svg);
  await sharp(Buffer.from(svg), { density: 600 }).resize(1600, 1600, { kernel: 'nearest' }).png().toFile(path.join(out, `${name}.png`));
  console.log('made', path.join(out, name + '.svg'), 'and .png ->', url);
}
