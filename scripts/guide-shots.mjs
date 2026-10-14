// Phone screenshots of the editor for GUIDE.html, taken against a throwaway
// copy of the content (nothing in the repo changes). Rerun after updating
// Sveltia so the guide matches what Gaz sees.
//
//   npm run build, start the trudrive preview (port 4600), then:
//   node scripts/guide-shots.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const OUT = 'guide';
fs.mkdirSync(OUT, { recursive: true });

const files = {};
for (const d of ['content/jobs', 'content/photos', 'content/videos']) for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.json'))) files[`${d}/${f}`] = fs.readFileSync(path.join(d, f), 'utf8');
for (const f of ['content/business.json', 'site/admin/config.yml', 'site/admin/index.html']) files[f] = fs.readFileSync(f, 'utf8');
const uploads = fs.readdirSync('site/uploads');

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const shot = async (name) => { await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };

await page.goto('http://localhost:4600/admin/');
await page.getByText(/Sign In with/).waitFor();
// The live site has no local-repository button; hide it so the shot matches.
await page.evaluate(() => {
  for (const el of document.querySelectorAll('button, p, div, span')) {
    if (el.childElementCount === 0 && /Local Repository|Once prompted/.test(el.textContent)) (el.closest('button') || el).style.display = 'none';
  }
});
await shot('1-sign-in');

// A copy of the content in the browser's private storage stands in for the repo.
await page.evaluate(async ({ files, uploads }) => {
  const root = await navigator.storage.getDirectory();
  for await (const [n] of root.entries()) await root.removeEntry(n, { recursive: true });
  const repo = await root.getDirectoryHandle('trudrive', { create: true });
  const write = async (p, data) => {
    const parts = p.split('/'); let dir = repo;
    for (const s of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(s, { create: true });
    const w = await (await dir.getFileHandle(parts.at(-1), { create: true })).createWritable();
    await w.write(data); await w.close();
  };
  await write('.git/HEAD', 'ref: refs/heads/main\n');
  for (const [p, c] of Object.entries(files)) await write(p, c);
  for (const u of uploads) await write(`site/uploads/${u}`, await fetch(`/uploads/${u}`).then((r) => r.blob()));
  window.showDirectoryPicker = async () => repo;
}, { files, uploads });
await page.evaluate(() => { for (const el of document.querySelectorAll('[style*="display"]')) if (/Local Repository|Once prompted/.test(el.textContent)) el.style.display = ''; });
await page.getByText('Work with Local Repository').click();

await page.getByText('Before and afters').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(2500);
await shot('2-home');

await page.getByText('Before and afters').first().click();
await page.getByText('Decking to porcelain').waitFor();
await page.waitForFunction(() => [...document.images].filter((i) => i.offsetParent).every((i) => i.complete && i.naturalWidth > 0));
await page.waitForTimeout(1500);
await shot('3-list');

// The round blue button adds a new one.
const buttons = page.locator('button');
const n = await buttons.count();
let added = false;
for (let i = n - 1; i >= 0 && !added; i--) {
  const b = buttons.nth(i);
  const label = ((await b.getAttribute('aria-label')) || '') + ((await b.getAttribute('title')) || '');
  if (/new|create|add/i.test(label) && await b.isVisible()) { await b.click(); added = true; }
}
if (!added) throw new Error('could not find the add button');
await page.getByText('What was the job?').waitFor();

await page.locator('input[type=text]').first().fill('Block paved drive');
const fileInputs = page.locator('input[type=file]');
await fileInputs.nth(0).setInputFiles({ name: 'IMG_5120.jpg', mimeType: 'image/jpeg', buffer: fs.readFileSync('src/tiktok/7558941538148093206-03.jpg') });
await page.waitForTimeout(2500);
// The after field's input is the next one still waiting for a file.
const count = await fileInputs.count();
for (let i = 0; i < count; i++) {
  const inField = await fileInputs.nth(i).evaluate((el) => {
    let e = el; for (let k = 0; k < 12 && e; k++) { e = e.parentElement; if (e && /After photo/.test(e.textContent) && !/Before photo/.test(e.textContent)) return true; }
    return false;
  });
  if (inField) { await fileInputs.nth(i).setInputFiles({ name: 'IMG_5188.jpg', mimeType: 'image/jpeg', buffer: fs.readFileSync('src/tiktok/7558941538148093206-05.jpg') }); break; }
}
await page.waitForTimeout(2500);
await shot('4-new-job');

await page.getByText('Put it on the home page').scrollIntoViewIfNeeded();
await page.evaluate(() => scrollBy(0, -120));
await shot('5-home-page-tick');

await page.getByRole('button', { name: 'Save' }).click();
await page.waitForTimeout(2500);
await shot('6-saved');

// Removing a job: open it, then the three dots at the top.
await page.getByText('Block paved drive').click();
await page.getByText('What was the job?').waitFor();
await page.waitForTimeout(1200);
const menus = page.locator('button[aria-haspopup]');
const mc = await menus.count();
let opened = false;
for (let i = 0; i < mc && !opened; i++) {
  const b = menus.nth(i);
  const box = await b.boundingBox();
  if (box && box.y < 80 && box.x > 250) { await b.click(); opened = true; }
}
if (!opened) throw new Error('could not find the menu at the top');
await page.getByText('Delete', { exact: false }).first().waitFor();
await shot('7-delete');
await page.keyboard.press('Escape');

// Business details: towns, address, hours.
await page.goto('http://localhost:4600/admin/#/collections/settings');
await page.getByText('Phone, towns, address and hours').waitFor({ timeout: 20000 });
// (the Business details list itself is not in the guide)
await page.goto('http://localhost:4600/admin/#/collections/settings/entries/business');
await page.getByText('Towns you cover').first().waitFor({ timeout: 20000 });
await page.getByText('Towns you cover').first().scrollIntoViewIfNeeded();
await page.evaluate(() => scrollBy(0, -140));
await shot('9-towns');

// A new review.
await page.goto('http://localhost:4600/admin/#/collections/reviews/new');
await page.getByText("Customer's name").waitFor({ timeout: 20000 });
await shot('10-review');

// A new video.
await page.goto('http://localhost:4600/admin/#/collections/videos/new');
await page.getByText('Or a TikTok link').waitFor({ timeout: 20000 });
await shot('11-video');

await browser.close();
