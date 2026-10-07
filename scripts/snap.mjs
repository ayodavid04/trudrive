// Targeted screenshots at exact scroll positions, plus a JS probe.
//   node scripts/snap.mjs <url> <out-prefix> [--w 1440 --h 900 --reduced]
//        [--at "0,0.5,#close:0.3,#close:1"]   positions: page fraction, or #id:act-progress
//        [--probe "js expression"]
import { chromium } from 'playwright-core';

const argv = process.argv.slice(2);
const url = argv[0], out = argv[1];
const opt = (n, d) => { const i = argv.indexOf(n); return i > -1 ? argv[i + 1] : d; };
const W = +opt('--w', 1440), H = +opt('--h', 900);
const at = opt('--at', '0').split(',');
const probe = opt('--probe', null);
const mobile = W < 861;

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 2,
  reducedMotion: argv.includes('--reduced') ? 'reduce' : 'no-preference',
  isMobile: mobile, hasTouch: mobile,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);

for (const [i, a] of at.entries()) {
  const y = await page.evaluate((a) => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (isNaN(parseFloat(a)) || a.includes(':')) {
      const [sel, p] = a.split(':');
      const el = document.querySelector(sel);
      const top = el.getBoundingClientRect().top + scrollY;
      const travel = Math.max(el.offsetHeight - innerHeight, 1);
      return Math.min(max, top + travel * parseFloat(p || 0));
    }
    return max * parseFloat(a);
  }, a);
  await page.evaluate((y) => { const l = window.TD && TD.lenis && TD.lenis(); if (l) l.scrollTo(y, { immediate: true }); else scrollTo(0, y); }, y);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}-${String(i).padStart(2, '0')}.png` });
}
if (probe) console.log(JSON.stringify(await page.evaluate(probe), null, 1));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors');
await browser.close();
