// Bytes over the wire: first screen, then after scrolling the whole page.
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
for (const [w, h, label] of [[1440, 900, 'desktop'], [390, 844, 'phone']]) {
  for (const name of ['', 'solid', 'premium', 'bold']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 861, hasTouch: w < 861 });
    const page = await ctx.newPage();
    const sizes = { image: 0, other: 0 };
    page.on('response', async (r) => {
      try { const b = await r.body(); const t = r.request().resourceType(); sizes[t === 'image' ? 'image' : 'other'] += b.length; } catch {}
    });
    await page.goto(`http://localhost:4600/${name}${name ? '/' : ''}`, { waitUntil: 'networkidle' });
    const first = { ...sizes };
    const H = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += h / 2) { await page.evaluate((y) => scrollTo(0, y), y); await page.waitForTimeout(120); }
    await page.waitForTimeout(800);
    const kb = (n) => Math.round(n / 1024) + ' KB';
    console.log(`${label.padEnd(7)} ${(name || 'index').padEnd(8)} first screen: images ${kb(first.image)}, other ${kb(first.other)} | whole page: images ${kb(sizes.image)}, other ${kb(sizes.other)}`);
    await ctx.close();
  }
}
await browser.close();
