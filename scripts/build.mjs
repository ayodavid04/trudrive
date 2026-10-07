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
// Content Gaz edits himself at /admin (site/admin/config.yml), read from content/:
//   <x-jobs></x-jobs>                              every before and after, newest first
//   <x-job slot="hero"> / <x-job slot="feature">   the home page pairs, from jobs ticked for the home page
//   <x-photos></x-photos>                          the finished photos gallery
//   {{phone}} {{tel}} {{wa}}                       his number as shown, for tel: links, for wa.me
// Run scripts/content.mjs first (npm run build does): it makes the photo sizes.
//
// SITE_URL sets the absolute URLs share previews need. Set it in the Cloudflare
// Pages settings once his domain is connected. Until then it follows the
// deploy host: Cloudflare gives each build a URL like abc123.trudrive.pages.dev,
// and dropping the first part gives the project's own trudrive.pages.dev.
import fs from 'node:fs';
import path from 'node:path';

function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.CF_PAGES_URL) {
    const u = new URL(process.env.CF_PAGES_URL);
    const host = process.env.CF_PAGES_BRANCH === 'main' ? u.hostname.split('.').slice(1).join('.') : u.hostname;
    console.warn(`WARNING: SITE_URL is not set in Cloudflare Pages, using https://${host}`);
    return `https://${host}`;
  }
  return 'http://localhost:4600';
}
const SITE_URL = siteUrl().replace(/\/$/, '');
const manifest = JSON.parse(fs.readFileSync('site/img/manifest.json', 'utf8'));
for (const [name, m] of Object.entries(JSON.parse(fs.readFileSync('site/img/up/manifest.json', 'utf8')))) {
  manifest[name] = { ...m, dir: 'img/up/' };
}

// ---------------------------------------------------------- content
// Nothing Gaz does in the editor should break a page. Anything unreadable, or
// a job whose photos did not process, is left off with a warning in the log.
const warn = (msg) => console.warn('WARNING: ' + msg);
const readDir = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => f.endsWith('.json'))
  .flatMap((f) => {
    try { return [JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))]; } catch { warn(`skipped ${dir}/${f}: not valid JSON`); return []; }
  });
const upName = (file) => 'up-' + path.basename(String(file)).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const hasPhoto = (file) => file && manifest[upName(file)];
const newestFirst = (a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''));
const jobs = readDir('content/jobs').filter((j) => {
  const ok = j.title && hasPhoto(j.before) && hasPhoto(j.after);
  if (!ok) warn(`left off the job "${j.title || '(no title)'}": it needs a title, a before photo and an after photo that processed`);
  return ok;
}).sort(newestFirst);
const photos = readDir('content/photos').filter((p) => {
  const ok = p.title && hasPhoto(p.photo);
  if (!ok) warn(`left off the photo "${p.title || '(no title)'}": it needs a title and a photo that processed`);
  return ok;
}).sort(newestFirst);
const business = readDir('content').find((b) => b.phone) || {};

// Whatever Gaz types is shown as text, never read as HTML.
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FOCUS = { middle: '50 50', low: '50 62', top: '50 30' };

// The editor checks the number's shape; this is the backstop if it is ever
// empty or mangled: the site keeps the number it launched with.
const LAUNCH_PHONE = '07923 485811';
let digits = String(business.phone || '').replace(/\D/g, '');
if (!/^(0|44)\d{9,10}$/.test(digits)) {
  warn(`phone number "${business.phone}" does not look right, using ${LAUNCH_PHONE}`);
  business.phone = LAUNCH_PHONE;
  digits = LAUNCH_PHONE.replace(/\D/g, '');
}
const intl = digits.startsWith('44') ? digits : '44' + digits.replace(/^0/, '');
const PHONE = { phone: esc(business.phone.trim()), tel: '+' + intl, wa: intl };

// If every job is deleted, the home page hero falls back to the launch photos.
const FALLBACK_HERO = { fixed: true, title: 'Decking to porcelain', before: 'j1-before', after: 'j1-after', crop: 'low',
  before_alt: 'Rotten timber decking down to a shed', after_alt: 'A grey porcelain patio down to the same shed, edged in black' };
const imgName = (job, k) => (job.fixed ? job[k] : upName(job[k]));

function ba(job, R, { slide = false, sizes, eager = false, style = '' }) {
  const focus = FOCUS[job.crop] || FOCUS.low;
  const label = `Before and after: ${esc(job.title)}`;
  const picAttrs = { sizes, focus, eager };
  const before = pic({ ...picAttrs, name: imgName(job, 'before'), class: 'ba__before', alt: `Before: ${esc(job.before_alt || job.title)}` }, R);
  const after = pic({ ...picAttrs, name: imgName(job, 'after'), class: 'ba__after', alt: `After: ${esc(job.after_alt || job.title)}` }, R);
  const open = slide
    ? `<div class="ba ba--slide" data-autoplay data-state="after" role="group" aria-label="${label}">`
    : `<div class="ba ba--fade" data-start="after" role="group" aria-label="${label}"${style ? ` style="${style}"` : ''}>`;
  return `${open}
        ${before}
        ${after}
        <span class="ba__tag" aria-hidden="true">After</span>
        <div class="ba__switch"><button type="button" value="before" aria-pressed="false">Before</button><button type="button" value="after" aria-pressed="true">After</button></div>
      </div>`;
}

const kicker = (job) => esc(job.kind) + (job.town ? ` in ${esc(job.town)}` : '');
const workList = (job) => (Array.isArray(job.work) ? job.work : String(job.work || '').split('\n'))
  .map((w) => String(w).trim()).filter(Boolean);
const ticks = (job) => (workList(job).length
  ? `<ul class="ticks">${workList(job).map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '');
const about = (job) => (job.about ? `<p class="muted">${esc(job.about)}</p>` : '');

function jobsList(R) {
  return jobs.map((job, i) => {
    const m = manifest[upName(job.before)];
    const port = m && m.h >= m.w * 0.95 ? ' pair--port' : '';
    return `<section class="pair${port}" aria-labelledby="w${i + 1}">
      ${ba(job, R, { sizes: '(max-width: 960px) 100vw, 620px' })}
      <div class="pair__txt">
        <p class="kicker">${kicker(job)}</p>
        <h2 id="w${i + 1}">${esc(job.title)}</h2>
        ${about(job)}
        ${ticks(job)}
      </div>
    </section>`;
  }).join('\n\n    ');
}

// The newest job ticked for the home page goes in the hero, the next one
// further down. If he has ticked fewer than two, the newest jobs fill in.
function homeJobs() {
  const picked = jobs.filter((j) => j.home);
  return [...picked, ...jobs.filter((j) => !j.home)].slice(0, 2);
}

function homeHero(R) {
  const [hero] = homeJobs();
  return ba(hero || FALLBACK_HERO, R, { slide: true, sizes: '(max-width: 960px) 100vw, 44vw', eager: true });
}

// The whole section between <x-job slot="feature"> and </x-job>, with its
// {{job}} filled in. With fewer than two jobs the section is left out.
function homeFeature(section, R) {
  const [, feature] = homeJobs();
  if (!feature) return '';
  return section.replace('{{job}}', `${ba(feature, R, { sizes: '(max-width: 960px) 100vw, 56vw', style: 'aspect-ratio: 4 / 3' })}
      <div class="split__txt">
        <p class="kicker">Before and after</p>
        <h2 id="ba-t">${esc(feature.title)}</h2>
        ${about(feature)}
        ${ticks(feature)}`);
}

function photosList(R) {
  return photos.map((p, i) => `<figure${i < 2 ? ' class="half"' : ''}>
          <div class="photo">${pic({ name: upName(p.photo), alt: esc(p.alt || p.title), sizes: i < 2 ? '(max-width: 960px) 100vw, 560px' : '(max-width: 960px) 100vw, 420px', focus: FOCUS[p.crop] || FOCUS.low }, R)}</div>
          <figcaption><b>${esc(p.title)}</b>${p.line ? `<span>${esc(p.line)}</span>` : ''}</figcaption>
        </figure>`).join('\n        ');
}

const attrs = (s) => {
  const out = {};
  for (const m of s.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) out[m[1]] = m[2] ?? true;
  return out;
};

function pic(a, R) {
  const m = manifest[a.name];
  if (!m) throw new Error(`no image called ${a.name}`);
  const I = R + (m.dir || 'img/');
  const srcset = m.widths.map((w) => `${I}${a.name}-${w}.webp ${w}w`).join(', ');
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
  return `<picture>${mobileSource}<source type="image/webp" srcset="${srcset}" sizes="${a.sizes || '100vw'}"><img${cls} src="${I}${a.name}.jpg" width="${m.w}" height="${m.h}" alt="${a.alt}" ${lazy} decoding="async"${focus}${pos}></picture>`;
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
  html = html.replace(/<x-jobs\s*\/?>(?:<\/x-jobs>)?/g, () => jobsList(R));
  html = html.replace(/<x-job\s+slot="feature">([\s\S]*?)<\/x-job>/g, (_, section) => homeFeature(section, R));
  html = html.replace(/<x-job\s+slot="hero"\s*\/?>(?:<\/x-job>)?/g, () => homeHero(R));
  html = html.replace(/<x-photos\s*\/?>(?:<\/x-photos>)?/g, () => photosList(R));
  html = html.replace(/{{(phone|tel|wa)}}/g, (_, k) => PHONE[k]);
  html = html.replaceAll('{{root}}', R);
  // The first mockups were written for one level deep; the chooser sits at the root.
  if (depth === 0) html = html.replaceAll('../img/', 'img/').replaceAll('../shared/', 'shared/');
  const outDir = path.join('site', outRel);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('built', path.join(outDir, 'index.html'));
}

// The quote sheet script carries the number too, for the WhatsApp message it opens.
const partsPath = 'site/shared/parts.js';
const parts = fs.readFileSync(partsPath, 'utf8')
  .replace(/var PHONE_DISPLAY = '[^']*';/, `var PHONE_DISPLAY = '${business.phone.trim().replace(/[^\d +]/g, '')}';`)
  .replace(/var PHONE_INTL = '[^']*';/, `var PHONE_INTL = '${PHONE.wa}';`);
fs.writeFileSync(partsPath, parts);
