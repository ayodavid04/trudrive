// Makes the web copy of every video in Gaz's Videos list (content/videos/).
//
// A video straight off a phone is too heavy for a web page and often the wrong
// format (iPhones record HEVC, which Chrome on most PCs will not play). So each
// one is re-encoded to an H.264 MP4 no bigger than 720 x 1280, sound kept for
// when a visitor taps play, plus a cover image. They land in site/img/up/
// beside the photo sizes, listed in videos.json for build.mjs.
//
// The editor saves videos to content/videos/files/, outside site/, so a phone
// file is never published as it is: Cloudflare Pages refuses any file over
// 25 MiB and would fail the whole deploy.
//
// ffmpeg comes from ffmpeg-static, an optional dependency. If it is ever
// missing, a video that is already an H.264 MP4 is used as it is and anything
// else is left off with a warning. The site always builds.
//
// A TikTok link instead of a file: the cover comes from TikTok's oEmbed and is
// saved at build time, so a visitor's browser asks TikTok for nothing until
// they press play.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const OUT = 'site/img/up';
// Cloudflare stops a build at 20 minutes. Encoding stops well short of that
// and anything left over waits for the next save, so a build never fails on
// time however many videos he adds.
const BUDGET_MS = 8 * 60 * 1000;
const MAX_SECONDS = 75;
const MAX_BYTES = 24 * 1024 * 1024;

async function findFfmpeg() {
  try {
    const p = (await import('ffmpeg-static')).default;
    if (p && fs.existsSync(p)) return p;
  } catch { /* not installed */ }
  return null;
}

// --------------------------------------------------------------- MP4 reading
// Just enough of the MP4 format to tell the codec, size and length without
// ffmpeg. Boxes are a size and a type, nested. QuickTime .mov is the same.
function boxes(buf, start, end) {
  const out = [];
  for (let i = start; i + 8 <= end;) {
    let size = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    let head = 8;
    if (size === 1) { size = Number(buf.readBigUInt64BE(i + 8)); head = 16; } else if (size === 0) size = end - i;
    if (size < head || i + size > end) break;
    out.push({ type, start: i + head, end: i + size });
    i += size;
  }
  return out;
}
const child = (buf, box, type) => boxes(buf, box.start, box.end).find((b) => b.type === type);

export function mp4Info(file) {
  const buf = fs.readFileSync(file);
  const moov = boxes(buf, 0, buf.length).find((b) => b.type === 'moov');
  if (!moov) return null;
  let duration = 0;
  const mvhd = child(buf, moov, 'mvhd');
  if (mvhd) {
    const v = buf[mvhd.start];
    const scale = buf.readUInt32BE(mvhd.start + (v === 1 ? 20 : 12));
    const dur = v === 1 ? Number(buf.readBigUInt64BE(mvhd.start + 24)) : buf.readUInt32BE(mvhd.start + 16);
    duration = scale ? dur / scale : 0;
  }
  for (const trak of boxes(buf, moov.start, moov.end).filter((b) => b.type === 'trak')) {
    const stsd = ['mdia', 'minf', 'stbl', 'stsd'].reduce((b, t) => b && child(buf, b, t), trak);
    if (!stsd) continue;
    const codec = buf.toString('latin1', stsd.start + 12, stsd.start + 16);
    if (!/^(avc1|avc3|hvc1|hev1|mp4v|av01|vp09)$/.test(codec)) continue;
    const tkhd = child(buf, trak, 'tkhd');
    let w = 0, h = 0;
    if (tkhd) {
      w = buf.readUInt32BE(tkhd.end - 8) >>> 16;
      h = buf.readUInt32BE(tkhd.end - 4) >>> 16;
      // Phones film portrait as landscape with a "turn it 90 degrees" matrix;
      // the browser turns it, so the page has to know the turned size.
      if (buf.readInt32BE(tkhd.end - 44) === 0 && buf.readInt32BE(tkhd.end - 28) === 0) [w, h] = [h, w];
    }
    return { codec, w, h, duration };
  }
  return null;
}

// ------------------------------------------------------------------- helpers
const ffmpegRun = (ffmpeg, args, timeout) =>
  spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], { timeout, maxBuffer: 64 * 1024 * 1024 });

const toCover = (input, dest) => sharp(input).rotate().resize({ width: 720, withoutEnlargement: true }).webp({ quality: 70, effort: 6 }).toFile(dest);

async function frameCover(ffmpeg, video, dest) {
  // A frame from just in, past any fade from black at the very start.
  const r = ffmpegRun(ffmpeg, ['-ss', '0.6', '-i', video, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], 60000);
  if (r.status !== 0 || !r.stdout?.length) return false;
  await toCover(r.stdout, dest);
  return true;
}

async function tiktok(link, dest) {
  // Share links from the app (vm.tiktok.com/...) redirect to the full address,
  // which holds the video's number and is what oEmbed wants.
  let url = link;
  for (let i = 0; i < 4 && !/\/video\/\d+/.test(url); i++) {
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    const next = r.headers.get('location');
    if (!next) break;
    url = new URL(next, url).href;
  }
  const id = url.match(/\/video\/(\d+)/)?.[1];
  if (!id) throw new Error('no video number in the link');
  try {
    const o = await (await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url.split('?')[0])}`, { signal: AbortSignal.timeout(10000) })).json();
    if (o.thumbnail_url) {
      await toCover(Buffer.from(await (await fetch(o.thumbnail_url, { signal: AbortSignal.timeout(15000) })).arrayBuffer()), dest);
      return { id, poster: true };
    }
  } catch { /* the card still works, just without a cover */ }
  return { id, poster: false };
}

export const videoKey = (v) => (v.video
  ? 'vid-' + path.basename(String(v.video)).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  : 'tt-' + crypto.createHash('sha1').update(String(v.tiktok).trim()).digest('hex').slice(0, 10));

// --------------------------------------------------------------------- main
// entries: the Videos list. coverPath(p): where an editor photo lives, for a
// cover photo he picked himself.
export async function makeVideos(entries, { warn, coverPath }) {
  fs.mkdirSync(OUT, { recursive: true });
  const manifestPath = path.join(OUT, 'videos.json');
  const old = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  const manifest = {};
  const ffmpeg = await findFfmpeg();
  const started = Date.now();
  let made = 0;
  const newer = (a, b) => fs.existsSync(a) && fs.existsSync(b) && fs.statSync(a).mtimeMs > fs.statSync(b).mtimeMs;
  // Windows keeps the original's date on a copy, which would make it look stale.
  const copy = (a, b) => { fs.copyFileSync(a, b); const now = new Date(); fs.utimesSync(b, now, now); };

  for (const v of entries) {
    const title = v.title || '(no title)';
    if (!v.video && !v.tiktok) { warn(`"${title}" has no video and no TikTok link, so it is left off the site`); continue; }
    const key = videoKey(v);
    const cover = path.join(OUT, `${key}-poster.webp`);
    const own = v.poster ? coverPath(v.poster) : null;
    const ownCover = own && fs.existsSync(own) ? own : null;

    try {
      if (v.video) {
        const src = path.join('.', String(v.video));
        if (!fs.existsSync(src)) { warn(`the video for "${title}" is missing (${v.video}), so it is left off the site`); continue; }
        const mp4 = path.join(OUT, `${key}.mp4`);
        if (old[key] && newer(mp4, src)) {
          manifest[key] = { ...old[key] };
        } else {
          const info = mp4Info(src);
          const bytes = fs.statSync(src).size;
          const h264 = info && /^avc/.test(info.codec);
          const light = h264 && bytes <= MAX_BYTES && Math.max(info.w, info.h) <= 1280 && bytes * 8 / Math.max(info.duration, 1) <= 3.5e6;
          if (light) {
            copy(src, mp4);
          } else if (ffmpeg) {
            if (Date.now() - started > BUDGET_MS) { warn(`ran out of time making videos: "${title}" goes on with the next save`); continue; }
            // Longest side 1280, never enlarged, at most 30 frames a second.
            // -map_metadata -1 drops the phone's GPS position from the file,
            // which would otherwise say where the customer lives.
            const r = ffmpegRun(ffmpeg, ['-y', '-i', src, '-t', String(MAX_SECONDS),
              '-vf', "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'", '-fpsmax', '30',
              '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-maxrate', '2M', '-bufsize', '4M',
              '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-map', '0:v:0', '-map', '0:a:0?',
              '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-map_metadata', '-1', '-movflags', '+faststart', mp4], 5 * 60 * 1000);
            if (r.status !== 0) throw new Error(String(r.stderr || r.error || 'ffmpeg failed').trim().split('\n').pop());
          } else if (h264 && bytes <= MAX_BYTES) {
            warn(`ffmpeg is not available, so "${title}" goes on as it is, heavier than it should be`);
            copy(src, mp4);
          } else {
            warn(`ffmpeg is not available, so "${title}" is left off until the next build that has it`);
            continue;
          }
          const out = mp4Info(mp4);
          if (!out || !out.w) throw new Error('the finished video could not be read');
          manifest[key] = { w: out.w, h: out.h, seconds: Math.round(out.duration), poster: false };
          made++;
        }
        if (ownCover) {
          if (!newer(cover, ownCover)) await toCover(ownCover, cover);
          manifest[key].poster = true;
        } else if (!manifest[key].poster || !fs.existsSync(cover)) {
          manifest[key].poster = ffmpeg ? await frameCover(ffmpeg, mp4, cover) : false;
        }
      } else {
        if (old[key] && (!old[key].poster || fs.existsSync(cover)) && !ownCover) { manifest[key] = old[key]; continue; }
        const t = await tiktok(String(v.tiktok).trim(), cover);
        if (ownCover) { await toCover(ownCover, cover); t.poster = true; }
        manifest[key] = { tiktok: t.id, w: 9, h: 16, poster: t.poster };
        made++;
      }
    } catch (e) {
      warn(`could not use the video "${title}" (${e.message}), so it is left off the site`);
      delete manifest[key];
    }
  }

  // Videos removed in the editor leave nothing behind.
  for (const f of fs.readdirSync(OUT)) {
    const m = f.match(/^((?:vid|tt)-.+?)(-poster\.webp|\.mp4)$/);
    if (m && !manifest[m[1]]) fs.rmSync(path.join(OUT, f));
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  return { count: Object.keys(manifest).length, made, ffmpeg: Boolean(ffmpeg) };
}
