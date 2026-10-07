// Functional checks: the quote sheet builds the right WhatsApp message and
// fails loudly without a job; the drag slider and the Solid divider move.
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
for (const name of ['solid', 'premium', 'bold']) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`http://localhost:4600/${name}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return {}; }; });
  await page.locator('[data-quote]').first().click();
  ok(await page.locator('#quote').evaluate((d) => d.open), `${name}: quote sheet opens`);
  await page.locator('#quote .quote__send').click();
  const err = await page.locator('#quote [data-status]').textContent();
  ok(/Pick what you need/.test(err), `${name}: sending with no job says so`);
  await page.selectOption('#quote select[name=job]', 'Patio');
  await page.fill('#quote input[name=where]', 'WN1');
  await page.fill('#quote input[name=name]', 'Test');
  await page.locator('#quote .quote__send').click();
  const url = (await page.evaluate(() => window.__opened))[0] || '';
  const text = decodeURIComponent(url.split('text=')[1] || '');
  ok(url.startsWith('https://wa.me/447923485811?text='), `${name}: opens WhatsApp to Gaz's number`);
  ok(/Job: Patio/.test(text) && /Area: WN1/.test(text) && /Name: Test/.test(text), `${name}: message carries job, area and name`);
  await page.keyboard.press('Escape');
  ok(!(await page.locator('#quote').evaluate((d) => d.open)), `${name}: Escape closes the sheet`);
  const cmp = page.locator('[data-compare]').first();
  if (await cmp.count()) {
    await cmp.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    const box = await cmp.boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down(); await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, { steps: 6 }); await page.mouse.up();
    const pos = await cmp.evaluate((e) => parseFloat(e.style.getPropertyValue('--pos')));
    ok(pos > 15 && pos < 26, `${name}: drag slider follows the pointer (${pos.toFixed(1)}%)`);
    await cmp.locator('.compare__range').focus(); await page.keyboard.press('ArrowRight');
    const pos2 = await cmp.evaluate((e) => parseFloat(e.style.getPropertyValue('--pos')));
    ok(pos2 > pos, `${name}: drag slider moves with the keyboard`);
  }
  if (name === 'solid') {
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    await page.locator('.divider__grip').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    const split = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--split'));
    ok(split.trim() === '58%', `solid: divider moves with arrow keys (${split.trim()})`);
  }
  ok(errors.length === 0, `${name}: no page errors ${errors.join(' | ')}`);
}
await browser.close();
console.log(fails ? `${fails} failed` : 'all passed');
process.exit(fails ? 1 : 0);
