// One-shot receiver: the TikTok tab hands the image list to a localhost popup,
// which posts it back here. TikTok's CSP blocks a direct fetch to localhost.
import http from 'node:http';
import fs from 'node:fs';
const out = process.argv[2];
const page = `<!doctype html><title>receiver</title><p id=s>waiting</p><script>
addEventListener('message', async e => { const r = await fetch('/', { method: 'POST', body: e.data }); document.getElementById('s').textContent = await r.text(); });
if (location.hash.length > 1) fetch('/', { method: 'POST', body: decodeURIComponent(location.hash.slice(1)) }).then(r => r.text()).then(t => document.getElementById('s').textContent = t);
</script>`;
const srv = http.createServer((req, res) => {
  if (req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(page); }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => { fs.writeFileSync(out, body); res.end('saved ' + body.length); console.log('saved', body.length); setTimeout(() => process.exit(0), 300); });
});
srv.listen(4599, () => console.log('listening 4599'));
setTimeout(() => { console.log('timeout'); process.exit(1); }, 300000);
