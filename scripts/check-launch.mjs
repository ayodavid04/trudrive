// Pre-launch checks, run against the built site on the preview
// server (port 4600). Prints PASS / FAIL / TODO per check; TODO means it is
// waiting on Gaz's details and the site is correctly hidden from Google.
//
//   npm run build, start the trudrive preview, then: node scripts/check-launch.mjs
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const B = 'http://localhost:4600';
// Every page in the sitemap, so a new page is checked without editing a list here.
const sitemap = fs.readFileSync('site/sitemap.xml', 'utf8');
const PAGES = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
let fails = 0;
const out = (tag, msg) => { console.log(`${tag.padEnd(4)} ${msg}`); if (tag === 'FAIL') fails++; };
const ok = (c, msg) => out(c ? 'PASS' : 'FAIL', msg);

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });

for (const p of PAGES) {
  for (const [w, h, mobile] of [[1280, 800, false], [390, 844, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    let bytes = 0;
    page.on('response', async (r) => { if (r.request().resourceType() === 'image') try { bytes += (await r.body()).length; } catch {} });
    const res = await page.goto(B + p, { waitUntil: 'networkidle' });
    const label = `${p} ${mobile ? 'phone' : 'desktop'}`;
    ok(res.status() === 200 && errs.length === 0, `${label}: loads on a fresh tab with no console errors ${errs.join(' | ')}`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: no sideways scroll`);
    if (!mobile) {
      const m = await page.evaluate(() => {
        const meta = (k) => document.querySelector(`meta[property="${k}"], meta[name="${k}"]`)?.content || '';
        return {
          h1: document.querySelectorAll('h1').length,
          title: document.title, desc: meta('description'),
          canonical: document.querySelector('link[rel=canonical]')?.href || '',
          og: ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name'].filter((k) => !meta(k)),
          ogImage: meta('og:image'), twitter: meta('twitter:card'), robots: meta('robots'),
          imgsNoAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).map((i) => i.src),
          imgsNoSize: [...document.images].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).map((i) => i.src),
          emDash: (document.body.innerText.match(/\u2014/g) || []).length,
          headingsInOrder: [...document.querySelectorAll('h1,h2,h3,h4')].map((x) => +x.tagName[1]).every((n, i, a) => i === 0 || n <= a[i - 1] + 1),
          canonicals: document.querySelectorAll('link[rel=canonical]').length,
          ldBad: [...document.querySelectorAll('script[type="application/ld+json"]')].filter((s) => { try { JSON.parse(s.textContent); return false; } catch { return true; } }).length,
        };
      });
      ok(m.h1 === 1, `${p}: exactly one h1 (${m.h1})`);
      ok(m.headingsInOrder, `${p}: headings in order`);
      ok(m.title && m.desc, `${p}: title and description`);
      ok(m.title.length <= 65, `${p}: title fits in a Google result (${m.title.length} characters)`);
      ok(m.canonicals === 1, `${p}: one canonical`);
      ok(m.ldBad === 0, `${p}: structured data parses`);
      ok(m.canonical.endsWith(p), `${p}: canonical ${m.canonical}`);
      ok(m.og.length === 0, `${p}: all og tags ${m.og.join(' ')}`);
      ok(/\.(jpe?g|png)$/.test(m.ogImage), `${p}: og:image is a JPEG or PNG`);
      ok(m.twitter === 'summary_large_image', `${p}: twitter card`);
      ok(m.imgsNoAlt.length === 0, `${p}: every image has alt ${m.imgsNoAlt.join(' ')}`);
      ok(m.imgsNoSize.length === 0, `${p}: every image has width and height ${m.imgsNoSize.join(' ')}`);
      ok(m.emDash === 0, `${p}: no em dashes in the copy`);
      out(m.robots.startsWith('index') ? 'PASS' : 'TODO', `${p}: robots "${m.robots}"`);
      const broken = await page.evaluate(async () => {
        const bad = [];
        for (const a of document.querySelectorAll('a[href]')) {
          const u = new URL(a.href, location.href);
          if (u.origin !== location.origin) continue;
          const r = await fetch(u.pathname); if (!r.ok) bad.push(u.pathname);
        }
        return [...new Set(bad)];
      });
      ok(broken.length === 0, `${p}: no broken internal links ${broken.join(' ')}`);
    }
    // Scroll the whole page so lazy images count towards the weight.
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += h / 2) { await page.evaluate((yy) => scrollTo(0, yy), y); await page.waitForTimeout(80); }
    await page.waitForTimeout(600);
    const kb = Math.round(bytes / 1024);
    out(kb < 1500 ? 'PASS' : 'FAIL', `${label}: images ${kb} KB for the whole page`);
    await ctx.close();
  }
}

// Reduced motion: nothing left invisible.
{
  const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(B + '/', { waitUntil: 'networkidle' });
  const hidden = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => getComputedStyle(e).opacity === '0' && e.offsetParent).length);
  ok(hidden === 0, `reduced motion: no content left invisible (${hidden})`);
  await ctx.close();
}

// The 404 page.
{
  const page = await browser.newPage();
  const res = await page.goto(B + '/404.html');
  ok(res.status() === 200 && await page.locator('h1').count() === 1, '/404.html exists with one h1');
  ok((await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'), '/404.html is noindex');
}
await browser.close();

// Files Google reads.
const robots = fs.readFileSync('site/robots.txt', 'utf8');
ok(PAGES.length >= 8, `sitemap lists ${PAGES.length} pages`);
out(robots.includes('Sitemap:') ? 'PASS' : 'TODO', `robots.txt ${robots.includes('Sitemap:') ? 'allows Google and points at the sitemap' : 'blocks everything: a local build (build with SITE_URL=https://trudrive.co.uk to check the live one)'}`);
ok(fs.existsSync('site/img/og.jpg'), 'share image site/img/og.jpg exists');

console.log(fails ? `\n${fails} FAILED` : '\nAll checks passed (TODO = a local build, kept out of Google)');
process.exit(fails ? 1 : 0);
