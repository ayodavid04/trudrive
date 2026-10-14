// Functional checks for Our work: the before and after reel, the filters,
// photos and videos full screen, and how it all behaves with reduced motion,
// on a phone and with JavaScript off.
//
//   npm run build, start the trudrive preview, then: node scripts/test-work.mjs
import { chromium } from 'playwright-core';

const URL = 'http://localhost:4600/our-work/';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const open = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await page.goto(URL, { waitUntil: 'networkidle' });
  return { page, ctx, errs };
};
const slides = (page) => page.locator('.show__slide').count();

// The reel plays by itself, and hands over to whoever picks a job.
{
  const { page, ctx, errs } = await open();
  const n = await slides(page);
  if (n < 2) {
    ok(true, `reel: ${n} job, shown as a plain before and after`);
  } else {
    await page.locator('#ba-t').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollBy(0, 200));
    const first = await page.locator('.show__slide.is-on').getAttribute('id');
    ok(await page.locator('.show__slide.is-on .ba').getAttribute('data-state') === 'before', 'reel: a job starts on its before');
    await page.waitForTimeout(3000);
    ok(await page.locator('.show__slide.is-on .ba').getAttribute('data-state') === 'after', 'reel: the after slides across on its own');
    await page.waitForTimeout(4000);
    ok(await page.locator('.show__slide.is-on').getAttribute('id') !== first, 'reel: moves on to the next job');
    ok(await page.locator('.show__slide').evaluateAll((s) => s.filter((x) => getComputedStyle(x).visibility === 'visible').length) === 1, 'reel: one job showing at a time');
    await page.locator('[data-play]').click();
    const held = await page.locator('.show__slide.is-on').getAttribute('id');
    await page.waitForTimeout(7500);
    ok(await page.locator('.show__slide.is-on').getAttribute('id') === held, 'reel: Pause holds it on one job');
    ok(await page.locator('[data-play]').getAttribute('aria-label') === 'Play', 'reel: the button then says Play');
    await page.locator('.show__thumb').last().click();
    ok(await page.locator('.show__slide').last().evaluate((s) => s.classList.contains('is-on')), 'reel: a thumbnail opens its job');
    ok(await page.locator('.show__slide.is-on .ba').getAttribute('data-state') === 'after', 'reel: a picked job shows its after');
    const before = await page.locator('.show__count').textContent();
    await page.locator('[data-next]').click();
    ok(await page.locator('.show__count').textContent() !== before, 'reel: Next moves on');
    const loaded = await page.evaluate(() => [...document.querySelectorAll('.show__slide img')].filter((i) => i.currentSrc).length);
    ok(loaded <= Math.min(n, 5) * 2, `reel: only the jobs near the current one have downloaded photos (${loaded / 2} of ${n})`);
  }
  ok(errs.length === 0, `reel: no console errors ${errs.join(' | ')}`);
  await ctx.close();
}

// Filters: a group shows only its own, and All brings everything back.
{
  const { page, ctx, errs } = await open();
  const filters = page.locator('[data-filters] button');
  const groups = await filters.count();
  if (groups < 3) {
    ok(true, 'filters: only one group of work, so no filter buttons');
  } else {
    for (let i = 1; i < groups; i++) {
      await filters.nth(i).click();
      const g = await filters.nth(i).getAttribute('data-filter');
      const wrong = await page.evaluate((grp) => [...document.querySelectorAll('.gallery figure, .vid, .show__thumb')]
        .filter((el) => !el.hidden && el.getAttribute('data-group') !== grp).length, g);
      ok(wrong === 0, `filters: "${await filters.nth(i).textContent()}" shows nothing from other groups`);
      const onReel = await page.evaluate((grp) => { const s = document.querySelector('.show__slide.is-on'); return !s || s.closest('[hidden]') || s.getAttribute('data-group') === grp; }, g);
      ok(onReel, `filters: the reel jumps to a "${g}" job`);
    }
    await filters.nth(0).click();
    const hidden = await page.evaluate(() => [...document.querySelectorAll('.vid, .show__thumb')].filter((el) => el.hidden).length);
    ok(hidden === 0, 'filters: All shows everything again');
  }
  ok(errs.length === 0, `filters: no console errors ${errs.join(' | ')}`);
  await ctx.close();
}

// Full screen: photos and videos open, step through, and close cleanly.
{
  const { page, ctx, errs } = await open();
  const photo = page.locator('.ph').first();
  await photo.scrollIntoViewIfNeeded();
  await photo.click();
  const dlg = page.locator('dialog.lb');
  ok(await dlg.evaluate((d) => d.open), 'viewer: a photo opens full screen');
  await page.waitForTimeout(400);
  const img = await dlg.locator('.lb__stage img').evaluate((i) => ({ w: i.clientWidth, h: i.clientHeight, nw: i.naturalWidth, vh: innerHeight }));
  ok(img.nw > 0 && img.h <= img.vh, `viewer: the photo loads and fits the screen (${img.nw}px file, ${img.h}px tall)`);
  ok(await page.evaluate(() => document.documentElement.style.overflow === 'hidden'), 'viewer: the page behind does not scroll');
  const c1 = await dlg.locator('.lb__count').textContent();
  await page.keyboard.press('ArrowRight');
  ok(await dlg.locator('.lb__count').textContent() !== c1, 'viewer: the right arrow key goes to the next photo');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  ok(!(await dlg.evaluate((d) => d.open)), 'viewer: Escape closes it');
  ok(await page.evaluate(() => document.documentElement.style.overflow === ''), 'viewer: the page scrolls again after');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('ph')), 'viewer: focus goes back to the photo that opened it');

  const vid = page.locator('.vid__open[data-lb="video"]').first();
  if (await vid.count()) {
    await vid.scrollIntoViewIfNeeded();
    await vid.click();
    await page.waitForTimeout(1200);
    const v = await dlg.locator('.lb__stage video').evaluate((x) => ({ playing: !x.paused, t: x.currentTime, muted: x.muted, h: x.clientHeight, vh: innerHeight }));
    ok(v.playing && v.t > 0, 'viewer: a video plays when tapped');
    ok(!v.muted, 'viewer: with sound');
    ok(v.h <= v.vh, 'viewer: the video fits the screen');
    await dlg.locator('.lb__close').click();
    await page.waitForTimeout(300);
    ok(await dlg.locator('.lb__stage').evaluate((s) => s.children.length === 0), 'viewer: closing stops the video');
  }
  const tt = page.locator('.vid__open[data-lb="tiktok"]').first();
  if (await tt.count()) {
    const before = [];
    page.on('request', (r) => { if (/tiktok/.test(r.url())) before.push(r.url()); });
    await page.reload({ waitUntil: 'networkidle' });
    ok(before.length === 0, 'TikTok: nothing is asked of TikTok until someone presses play');
    await page.locator('.vid__open[data-lb="tiktok"]').first().scrollIntoViewIfNeeded();
    await page.locator('.vid__open[data-lb="tiktok"]').first().click();
    ok(/tiktok\.com\/player\/v1\/\d+/.test(await page.locator('dialog.lb iframe').getAttribute('src')), 'TikTok: pressing play loads its player');
    await page.keyboard.press('Escape');
  }
  ok(errs.length === 0, `viewer: no console errors ${errs.join(' | ')}`);
  await ctx.close();
}

// Desktop hover gives a silent preview.
{
  const { page, ctx } = await open();
  const card = page.locator('.vid__open[data-lb="video"]').first();
  if (await card.count()) {
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(900);
    const v = await card.locator('video').evaluate((x) => ({ playing: !x.paused, muted: x.muted }));
    ok(v.playing && v.muted, 'videos: hovering plays a silent preview');
    await page.mouse.move(5, 5);
    await page.waitForTimeout(200);
    ok(await card.locator('video').evaluate((x) => x.paused), 'videos: moving off stops it');
  }
  await ctx.close();
}

// Reduced motion: nothing plays by itself, every job shows its after.
{
  const { page, ctx } = await open({ reducedMotion: 'reduce' });
  if (await slides(page) > 1) {
    const first = await page.locator('.show__slide.is-on').getAttribute('id');
    await page.locator('#ba-t').scrollIntoViewIfNeeded();
    await page.waitForTimeout(7500);
    ok(await page.locator('.show__slide.is-on').getAttribute('id') === first, 'reduced motion: the reel does not play by itself');
    ok(await page.locator('.show__slide.is-on .ba').getAttribute('data-state') === 'after', 'reduced motion: it shows the after');
  }
  const hiddenText = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => getComputedStyle(e).opacity === '0' && e.offsetParent && !e.closest('.show__slide:not(.is-on)')).length);
  ok(hiddenText === 0, `reduced motion: nothing left invisible (${hiddenText})`);
  await ctx.close();
}

// A phone: swipe the reel, the videos row scrolls sideways, no page overflow.
{
  const { page, ctx } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no sideways scroll on the page');
  if (await slides(page) > 1) {
    const box = await page.locator('.show__slides').boundingBox();
    const before = await page.locator('.show__count').textContent();
    await page.locator('.show__slides').evaluate((el, b) => {
      const y = b.y + b.height / 3;
      const ev = (type, x) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', clientX: x, clientY: y }));
      ev('pointerdown', b.x + b.width * 0.8); ev('pointerup', b.x + b.width * 0.2);
    }, box);
    ok(await page.locator('.show__count').textContent() !== before, 'phone: a swipe moves the reel on');
  }
  const row = page.locator('.vids').first();
  if (await row.count()) ok(await row.evaluate((r) => r.scrollWidth > r.clientWidth), 'phone: the videos swipe sideways');
  await ctx.close();
}

// JavaScript off: every job, video and photo is still there to see.
{
  const { page, ctx } = await open({ javaScriptEnabled: false });
  const n = await slides(page);
  const visible = await page.locator('.show__slide').evaluateAll((s) => s.filter((x) => x.getBoundingClientRect().height > 0 && getComputedStyle(x).visibility === 'visible').length);
  ok(visible === n, `no JavaScript: all ${n} before and afters are listed`);
  ok(await page.locator('[data-filters]').evaluate((f) => f.hidden).catch(() => true), 'no JavaScript: the filter buttons, which need it, stay hidden');
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
