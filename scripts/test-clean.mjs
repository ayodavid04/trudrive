// Functional checks for the Clean site.
import { chromium } from 'playwright-core';
const B = 'http://localhost:4600/';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const stub = () => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return {}; }; };

for (const pg of ['', 'services/', 'our-work/', 'about/', 'reviews/', 'contact/']) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  const res = await page.goto(B + pg, { waitUntil: 'networkidle' });
  ok(res.status() === 200 && errs.length === 0, `/${pg || ''}: loads, no errors ${errs.join(' | ')}`);
  const cur = await page.locator('.nav a[aria-current="page"]').count();
  ok(cur === 1, `/${pg}: one nav item marked current`);
  const broken = await page.evaluate(async () => {
    const bad = [];
    for (const a of document.querySelectorAll('a[href]')) {
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || u.hash && u.pathname === location.pathname) continue;
      const r = await fetch(u.pathname); if (!r.ok) bad.push(u.pathname);
    }
    for (const img of document.images) if (!img.complete || (img.loading !== 'lazy' && !img.naturalWidth)) { if (img.loading !== 'lazy') bad.push('img ' + img.currentSrc); }
    return [...new Set(bad)];
  });
  ok(broken.length === 0, `/${pg}: no broken internal links ${broken.join(' ')}`);
  await page.context().close();
}

// Home: hero slide ends on after; header quote opens the sheet.
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(B, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3200);
  ok(await page.locator('.hero .ba').getAttribute('data-state') === 'after', 'home: hero slides from before to after on its own');
  await page.locator('.hero .ba__switch button[value=before]').click();
  ok(await page.locator('.hero .ba').getAttribute('data-state') === 'before', 'home: hero Before button works');
  await page.evaluate(stub);
  await page.locator('.head .btn[data-quote]').click();
  ok(await page.locator('#quote').evaluate((d) => d.open), 'home: header quote button opens the sheet');
  await page.selectOption('#quote select[name=job]', 'Patio');
  await page.locator('#quote .quote__send').click();
  const u = (await page.evaluate(() => window.__opened))[0] || '';
  ok(u.startsWith('https://wa.me/447923485811') && decodeURIComponent(u).includes('Job: Patio'), 'home: sheet sends to WhatsApp with the job');
  await page.context().close();
}
// Services: a service button pre-picks its job.
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(B + 'services/', { waitUntil: 'networkidle' });
  await page.locator('[data-quote="New driveway"]').click();
  ok(await page.locator('#quote select[name=job]').inputValue() === 'New driveway', 'services: "Get a driveway quote" pre-picks New driveway');
  await page.context().close();
}
// Our work: fade toggles.
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(B + 'our-work/', { waitUntil: 'networkidle' });
  const ba = page.locator('.ba').first();
  ok(await ba.getAttribute('data-state') === 'after', 'our work: pairs open on the finished job');
  await ba.locator('button[value=before]').click();
  ok(await ba.getAttribute('data-state') === 'before' && await ba.locator('button[value=before]').getAttribute('aria-pressed') === 'true', 'our work: Before toggle switches and reports pressed');
  await page.context().close();
}
// Contact: inline form fails loudly, then sends.
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await page.goto(B + 'contact/', { waitUntil: 'networkidle' });
  await page.evaluate(stub);
  await page.locator('form[data-whatsapp] button[type=submit]').click();
  ok(/Pick what you need/.test(await page.locator('form[data-whatsapp] [data-status]').textContent()), 'contact: no job picked says so');
  await page.selectOption('form[data-whatsapp] select[name=job]', 'Fencing');
  await page.fill('form[data-whatsapp] input[name=where]', 'WN2');
  await page.locator('form[data-whatsapp] button[type=submit]').click();
  const u = decodeURIComponent((await page.evaluate(() => window.__opened))[0] || '');
  ok(u.includes('Job: Fencing') && u.includes('Area: WN2'), 'contact: form sends job and area to WhatsApp');
  ok(await page.locator('.band').isHidden(), 'contact: quote band hidden on the quote page');
  await page.context().close();
}
// Phone: menu opens and closes; dock is there.
{
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await page.goto(B, { waitUntil: 'networkidle' });
  ok(await page.locator('.dock').isVisible(), 'phone: call / WhatsApp / quote bar shows');
  await page.tap('.head__menu');
  ok(await page.locator('#drawer').isVisible() && await page.locator('.head__menu').getAttribute('aria-expanded') === 'true', 'phone: menu opens');
  await page.keyboard.press('Escape');
  ok(!(await page.locator('#drawer').isVisible()), 'phone: Escape closes the menu');
  await page.context().close();
}
// Reduced motion: hero shows the after straight away.
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })).newPage();
  await page.goto(B, { waitUntil: 'networkidle' });
  ok(await page.locator('.hero .ba').getAttribute('data-state') === 'after', 'reduced motion: hero skips the slide');
  await page.context().close();
}
await browser.close();
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
