// Expands the page sources in pages/ into site/.
//
//   pages/index.html          -> site/index.html
//   pages/solid.html          -> site/solid/index.html
//   pages/clean/index.html    -> site/clean/index.html
//   pages/clean/services.html -> site/clean/services/index.html
//   Files starting with _ are partials.
//
// Tags:
//   <x-pic name="j1-before" alt="..." sizes="50vw" class="..." focus="50 60" eager [mobile="name"] [plain]>
//   <x-head title="..." desc="..." path="clean/services/"></x-head>
//   <x-quote></x-quote>                            the shared quote sheet
//   <x-include file="clean/_header.html" active="services"></x-include>
//   {{root}}                                       relative path back to the site root
//
// SITE_URL sets the absolute URLs share previews need. It follows the deploy
// host until a custom domain exists.
import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = (process.env.SITE_URL || 'http://localhost:4600').replace(/\/$/, '');
const manifest = JSON.parse(fs.readFileSync('site/img/manifest.json', 'utf8'));

const attrs = (s) => {
  const out = {};
  for (const m of s.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) out[m[1]] = m[2] ?? true;
  return out;
};

function pic(a, R) {
  const m = manifest[a.name];
  if (!m) throw new Error(`no image called ${a.name}`);
  const srcset = m.widths.map((w) => `${R}img/${a.name}-${w}.webp ${w}w`).join(', ');
  const lazy = a.eager ? 'fetchpriority="high"' : 'loading="lazy"';
  const cls = a.class ? ` class="${a.class}"` : '';
  const focus = a.focus ? ` data-focus="${a.focus}"` : '';
  const pos = a.focus ? ` style="object-position:${a.focus.split(' ').map((v) => v + '%').join(' ')}"` : '';
  if (a.plain) {
    // Canvas sources. No w-descriptor srcset: with one, naturalWidth reports
    // CSS pixels instead of the file's pixels and drawImage crops short.
    const big = Math.max(...m.widths.filter((w) => w <= 1600));
    const mob = a.mobile ? manifest[a.mobile] : m;
    const mobName = a.mobile || a.name;
    const mobW = mob.widths.includes(800) ? 800 : Math.max(...mob.widths);
    const mfocus = a['focus-mobile'] ? ` data-focus-mobile="${a['focus-mobile']}"` : '';
    return `<picture><source media="(max-width: 860px)" srcset="${R}img/${mobName}-${mobW}.webp"><img${cls} src="${R}img/${a.name}-${big}.webp" width="${m.w}" height="${m.h}" alt="${a.alt}" loading="lazy" decoding="async"${focus}${mfocus}></picture>`;
  }
  let mobileSource = '';
  if (a.mobile) {
    // A different photo on phones: portrait pairs suit a phone, landscape a desktop.
    const mm = manifest[a.mobile];
    mobileSource = `<source media="(max-width: 860px)" type="image/webp" srcset="${mm.widths.map((w) => `${R}img/${a.mobile}-${w}.webp ${w}w`).join(', ')}" sizes="100vw">`;
  }
  return `<picture>${mobileSource}<source type="image/webp" srcset="${srcset}" sizes="${a.sizes || '100vw'}"><img${cls} src="${R}img/${a.name}.jpg" width="${m.w}" height="${m.h}" alt="${a.alt}" ${lazy} decoding="async"${focus}${pos}></picture>`;
}

function head(a, R) {
  const url = `${SITE_URL}/${a.path || ''}`;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${a.title}</title>
<meta name="description" content="${a.desc}">
<meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TruDrive Driveways &amp; Patios">
<meta property="og:title" content="${a.title}">
<meta property="og:description" content="${a.desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}/img/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="${R}img/favicon.png">
<link rel="apple-touch-icon" href="${R}img/apple-touch-icon.png">
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>`;
}

function include(a, R) {
  let html = fs.readFileSync(path.join('pages', a.file), 'utf8');
  if (a.active) html = html.replace(`data-nav="${a.active}"`, `data-nav="${a.active}" aria-current="page"`);
  return html;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}

const quote = fs.readFileSync('pages/_quote.html', 'utf8');

for (const file of walk('pages')) {
  const base = path.basename(file);
  if (!base.endsWith('.html') || base.startsWith('_')) continue;
  const rel = path.relative('pages', file).replace(/\\/g, '/').replace(/\.html$/, '');
  const outRel = rel === 'index' ? '' : rel.endsWith('/index') ? rel.slice(0, -'/index'.length) : rel;
  const depth = outRel ? outRel.split('/').length : 0;
  const R = '../'.repeat(depth);
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<x-include\s+([^>]*?)\s*\/?>(?:<\/x-include>)?/g, (_, s) => include(attrs(s), R));
  html = html.replace(/<x-pic\s+([^>]*?)\s*\/?>(?:<\/x-pic>)?/g, (_, s) => pic(attrs(s), R));
  html = html.replace(/<x-head\s+([^>]*?)\s*\/?>(?:<\/x-head>)?/g, (_, s) => head(attrs(s), R));
  html = html.replace(/<x-quote\s*\/?>(?:<\/x-quote>)?/g, quote);
  html = html.replaceAll('{{root}}', R);
  // The first mockups were written for one level deep; the chooser sits at the root.
  if (depth === 0) html = html.replaceAll('../img/', 'img/').replaceAll('../shared/', 'shared/');
  const outDir = path.join('site', outRel);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('built', path.join(outDir, 'index.html'));
}
