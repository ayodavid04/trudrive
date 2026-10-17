// Tells Bing (and the other IndexNow search engines) about every page in the
// live sitemap, so new or changed pages are picked up within hours instead of
// waiting for a crawl. No account needed: the key file at the site root proves
// the site is ours. Bing's index is what ChatGPT search and Copilot read.
//
//   node scripts/indexnow.mjs            after a deploy has gone live
import fs from 'node:fs';

const SITE = 'https://trudrive.co.uk';
const keyFile = fs.readdirSync('site').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error('no IndexNow key file in site/');
const key = keyFile.replace('.txt', '');

const live = await (await fetch(`${SITE}/${keyFile}`)).text();
if (live.trim() !== key) throw new Error(`${SITE}/${keyFile} is not live yet: deploy first`);

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(SITE).host, key, keyLocation: `${SITE}/${keyFile}`, urlList }),
});
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} pages`);
if (res.status >= 300) console.log(await res.text());
