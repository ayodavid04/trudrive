// Downloads the images listed in src/tiktok/manifest.json. Concept-demo stand-ins
// until Gaz sends his originals.
import fs from 'node:fs';
const dir = 'src/tiktok';
const { files } = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));
let ok = 0;
for (const { f, u } of files) {
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.tiktok.com/' } });
  if (!r.ok) { console.log('FAIL', r.status, f); continue; }
  fs.writeFileSync(`${dir}/${f}`, Buffer.from(await r.arrayBuffer()));
  ok++;
}
console.log(`downloaded ${ok}/${files.length}`);
