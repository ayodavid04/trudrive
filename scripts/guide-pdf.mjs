// guide/index.html -> guide/TruDrive-website-guide.pdf, for Gaz to keep on his phone.
//   node scripts/guide-shots.mjs first if the editor has changed.
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage();
await page.goto(pathToFileURL('guide/index.html').href, { waitUntil: 'networkidle' });
await page.pdf({ path: 'guide/TruDrive-website-guide.pdf', format: 'A4', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' }, printBackground: true });
const text = await page.evaluate(() => document.body.innerText);
console.log('em dashes in the rendered text:', (text.match(/\u2014/g) || []).length);
await page.setViewportSize({ width: 900, height: 1300 });
await page.screenshot({ path: 'guide/_preview.png' });
await browser.close();
