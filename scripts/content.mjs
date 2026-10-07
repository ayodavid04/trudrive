// Turns the photos Gaz uploads through the editor (site/uploads/) into the
// resized WebP set the pages use, plus a JPEG fallback, in site/img/up/.
//
// The editor already shrinks phone photos to 2000 px WebP on upload, so the
// file in site/uploads/ is the master. This script never touches it.
// Runs on every Netlify build; locally it skips photos already done.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const UPLOADS = 'site/uploads';
const OUT = 'site/img/up';
const WIDTHS = [480, 800, 1200, 1600];

fs.mkdirSync(OUT, { recursive: true });

// Nothing Gaz does in the editor should stop the site updating. A file or
// photo that cannot be read is skipped with a warning in the Netlify log, and
// everything else still goes live.
const warn = (msg) => console.warn('WARNING: ' + msg);
const readDir = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [])
  .flatMap((f) => {
    try { return [JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))]; } catch { warn(`skipped ${dir}/${f}: not valid JSON`); return []; }
  });

// Every image a content file points at, as an upload filename.
const used = new Set();
for (const job of readDir('content/jobs')) for (const k of ['before', 'after']) if (job[k]) used.add(path.basename(job[k]));
for (const p of readDir('content/photos')) if (p.photo) used.add(path.basename(p.photo));

const nameFor = (file) => 'up-' + path.basename(file).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

const manifestPath = path.join(OUT, 'manifest.json');
const old = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const manifest = {};
let made = 0;

for (const file of used) {
  const src = path.join(UPLOADS, file);
  if (!fs.existsSync(src)) { warn(`${file} is missing from ${UPLOADS}, so its job or photo is left off the site`); continue; }
  const name = nameFor(file);
  const fallback = path.join(OUT, `${name}.jpg`);
  if (old[name] && fs.existsSync(fallback) && fs.statSync(fallback).mtimeMs > fs.statSync(src).mtimeMs) {
    manifest[name] = old[name];
    continue;
  }
  try {
    // rotate() applies the phone's orientation flag before anything reads the size.
    const img = sharp(src).rotate();
    const meta = await sharp(src).metadata();
    const [w, h] = meta.orientation >= 5 ? [meta.height, meta.width] : [meta.width, meta.height];
    // Portrait phone photos land around 1125 to 1350 wide: keep the full width
    // as the top size so a retina hero is not drawn from the 800.
    const widths = WIDTHS.filter((tw) => tw <= w);
    if (!widths.length || (w < 1600 && w - widths[widths.length - 1] > 100)) widths.push(w);
    for (const tw of widths) {
      await img.clone().resize({ width: tw }).webp({ quality: tw >= 1200 ? 70 : 74, effort: 6 }).toFile(path.join(OUT, `${name}-${tw}.webp`));
    }
    await img.clone().resize({ width: Math.min(1200, w) }).jpeg({ quality: 74, mozjpeg: true }).toFile(fallback);
    manifest[name] = { w, h, widths };
    made++;
  } catch (e) {
    // An iPhone HEIC that slipped past the editor, a video, a broken upload.
    warn(`could not read ${file} (${e.message}), so its job or photo is left off the site`);
  }
}

// Photos removed in the editor leave nothing behind on the site.
// Matched by exact filename: a name like IMG_4821 ends in digits, so it cannot
// be told apart from a size suffix by pattern.
const keep = new Set(['manifest.json']);
for (const [name, m] of Object.entries(manifest)) {
  keep.add(`${name}.jpg`);
  for (const w of m.widths) keep.add(`${name}-${w}.webp`);
}
for (const f of fs.readdirSync(OUT)) if (!keep.has(f)) fs.rmSync(path.join(OUT, f));

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log(`content photos: ${Object.keys(manifest).length} in use, ${made} processed`);
