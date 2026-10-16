// Expands the page sources in pages/ into site/, plus sitemap.xml and robots.txt.
//
//   pages/index.html          -> site/index.html
//   pages/services.html       -> site/services/index.html
//   pages/404.html            -> site/404.html
//   Files starting with _ are partials.
//
// Tags:
//   <x-pic name="j1-before" alt="..." sizes="50vw" class="..." focus="50 60" eager [mobile="name"] [plain]>
//   <x-head title="..." desc="..." path="services/" [noindex]></x-head>
//   <x-quote></x-quote>                            the shared quote sheet
//   <x-include file="_header.html" active="services"></x-include>
//   {{root}}                                       the site root, /
//   {{year}}                                       this year, for the footer
//
// Content Gaz edits himself at /admin (site/admin/config.yml), read from content/:
//   <x-job slot="hero"> / <x-job slot="feature">   the home page pairs, from jobs switched on for the home page
//   <x-photos></x-photos>                          the finished photos gallery, opening full screen
//   <x-filters></x-filters>                        Driveways / Patios and gardens / Fencing buttons (gallery.js)
//   <x-showcase>...{{showcase}}...</x-showcase>    every before and after as one playing reel; left out with none
//   <x-videos [home]>...{{videos}}...</x-videos>   the Videos list as a row of cards; left out with none
//   <x-reviews></x-reviews>                        the reviews he has copied in, and his Google buttons
//   <x-reviews home>...{{reviews}}...</x-reviews>  the newest review; the section is left out with none
//   <x-where [contact]></x-where>                  towns, hours and address, from Business details
//   <x-about-text>, <x-about-photo>                About you
//   <x-ldjson></x-ldjson>                          LocalBusiness data for Google
//   <x-page-ld name path [service] [parent parent-name]>   breadcrumb (and Service) data for a page
//   <x-faq-ld></x-faq-ld>                          FAQPage data from the section marked data-faq
//   <x-town-cards>, {{homePlaces}}                 the Areas page: towns near Wigan, and Wigan's own districts
//   pages/_town.html                               one page per town in content/towns.json, at /areas/<slug>/
//   pages/_job.html                                one page per before and after, at /our-work/<slug>/
//   {{phone}} {{tel}} {{wa}}                       his number as shown, for tel: links, for wa.me
// Run scripts/content.mjs first (npm run build does): it makes the photo sizes.
//
// SITE_URL sets the absolute URLs share previews need. A build on Cloudflare
// (Workers Builds sets CI) uses the live domain unless SITE_URL overrides it;
// a local build uses the preview server.
import fs from 'node:fs';
import path from 'node:path';
import { videoKey } from './videos.mjs';

function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.CI || process.env.WORKERS_CI || process.env.CF_PAGES) return 'https://trudrive.co.uk';
  return 'http://localhost:4600';
}
const SITE_URL = siteUrl().replace(/\/$/, '');
// The live site is in search results; a local or preview build never is.
const LIVE = !/localhost|127\.0\.0\.1|vercel\.app/.test(SITE_URL);
const manifest = JSON.parse(fs.readFileSync('site/img/manifest.json', 'utf8'));
for (const [name, m] of Object.entries(JSON.parse(fs.readFileSync('site/img/up/manifest.json', 'utf8')))) {
  manifest[name] = { ...m, dir: 'img/up/' };
}

// ---------------------------------------------------------- content
// Nothing Gaz does in the editor should break a page. Anything unreadable, or
// a job whose photos did not process, is left off with a warning in the log.
const warn = (msg) => console.warn('WARNING: ' + msg);
const readDir = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((f) => f.endsWith('.json'))
  .flatMap((f) => {
    try { return [JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))]; } catch { warn(`skipped ${dir}/${f}: not valid JSON`); return []; }
  });
const upName = (file) => 'up-' + path.basename(String(file)).replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const hasPhoto = (file) => file && manifest[upName(file)];
const newestFirst = (a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''));
const jobs = readDir('content/jobs').filter((j) => {
  const ok = j.title && hasPhoto(j.before) && hasPhoto(j.after);
  if (!ok) warn(`left off the job "${j.title || '(no title)'}": it needs a title, a before photo and an after photo that processed`);
  return ok;
}).sort(newestFirst);
const photos = readDir('content/photos').filter((p) => {
  const ok = p.title && hasPhoto(p.photo);
  if (!ok) warn(`left off the photo "${p.title || '(no title)'}": it needs a title and a photo that processed`);
  return ok;
}).sort(newestFirst);
const readJson = (file) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch { warn(`could not read ${file}, using blanks`); return {}; }
};
const business = readJson('content/business.json');
const google = readJson('content/google.json');
const aboutMe = readJson('content/about.json');
const ownReviews = readDir('content/reviews').filter((r) => r.name && r.text);
// Straight from Google when the build could fetch them (scripts/google-reviews.mjs),
// plus any he copied in himself that Google did not send.
const fromGoogle = (() => { try { return JSON.parse(fs.readFileSync('site/img/up/google.json', 'utf8')); } catch { return null; } })();
const googleNames = new Set((fromGoogle?.reviews || []).map((r) => r.name.toLowerCase()));
const reviews = [...(fromGoogle?.reviews || []), ...ownReviews.filter((r) => !googleNames.has(String(r.name).toLowerCase()))].sort(newestFirst);
// Videos the content step made a web copy of (scripts/videos.mjs). Any it
// could not use were already reported there.
const videoManifest = (() => { try { return JSON.parse(fs.readFileSync('site/img/up/videos.json', 'utf8')); } catch { return {}; } })();
const videos = readDir('content/videos').filter((v) => v.title && (v.video || v.tiktok) && videoManifest[videoKey(v)]).sort(newestFirst);

// The gallery's filter buttons. Each type of job belongs to one of these.
const GROUPS = [['driveways', 'Driveways'], ['gardens', 'Patios and gardens'], ['fencing', 'Fencing']];
const groupOf = (kind) => (kind === 'Driveway' ? 'driveways' : kind === 'Fencing' ? 'fencing' : kind ? 'gardens' : '');
const groupAttr = (kind) => (groupOf(kind) ? ` data-group="${groupOf(kind)}"` : '');

// Whatever Gaz types is shown as text, never read as HTML.
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// The reverse, for text going into structured data and the sitemap.
const unesc = (v) => String(v ?? '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const xml = esc;
const clean = (v) => String(v ?? '').trim();
const isUrl = (v) => /^https:\/\/\S+$/.test(clean(v));
// His links from the editor win; otherwise they come from his place ID.
const placeId = clean(process.env.GOOGLE_PLACE_ID);
const reviewLink = isUrl(google.review_link) ? clean(google.review_link)
  : placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}` : '';
const profileLink = isUrl(google.profile_link) ? clean(google.profile_link) : isUrl(fromGoogle?.mapsUrl) ? fromGoogle.mapsUrl : '';

const areas = (Array.isArray(business.areas) ? business.areas : String(business.areas || '').split('\n')).map(clean).filter(Boolean);
const andList = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const address = [business.street, business.town, clean(business.postcode).toUpperCase()].map(clean).filter(Boolean);
const hasAddress = Boolean(clean(business.street) && clean(business.town) && clean(business.postcode));
// The town he works from, shown as "Based in Wigan" until the full address is in.
const baseTown = clean(business.town);
const facebook = isUrl(business.facebook) ? clean(business.facebook) : '';

// Towns near Wigan with a page of their own (content/towns.json), each with how
// far it is from his base, as the crow flies.
const townData = readJson('content/towns.json');
const HOME = townData.home || { name: baseTown, places: [] };
const COUNCILS = townData.councils || {};
const milesFrom = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
};
const TOWNS = (Array.isArray(townData.towns) ? townData.towns : [])
  .filter((t) => t.name && t.slug && COUNCILS[t.council])
  .map((t) => ({ ...t, places: Array.isArray(t.places) && t.places.length ? t.places : [t.name], near: Array.isArray(t.near) ? t.near : [],
    miles: HOME.lat && t.lat ? Math.max(1, Math.round(milesFrom(HOME, t))) : 0 }));
const townBySlug = Object.fromEntries(TOWNS.map((t) => [t.slug, t]));
const byMiles = (a, b) => a.miles - b.miles;
const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const townLink = (t) => `<a class="town" href="/areas/${t.slug}/"><b>${esc(t.name)}</b><span>About ${t.miles} miles from ${esc(HOME.name)}, ${esc(t.postcodes)}</span></a>`;

// Whatever the law or Google still needs from Gaz is listed in the build log
// every time. A yellow note says it on a local preview, never on the live site.
const told = new Set();
const note = (text) => {
  if (!told.has(text)) { told.add(text); warn(`for Gaz: ${text}`); }
  return LIVE ? '' : `<p class="demo-note"><b>For Gaz:</b> ${text}</p>`;
};

function where(style) {
  const lines = [];
  if (baseTown && !hasAddress) lines.push(`<p>Based in ${esc(baseTown)}.</p>`);
  const near = [...TOWNS].sort(byMiles).slice(0, 8).map((t) => `<a href="/areas/${t.slug}/">${esc(t.name)}</a>`);
  const wide = areas.length ? `across ${esc(andList(areas))}` : 'across the North West';
  lines.push(near.length
    ? `<p>Driveways and patios in ${near.join(', ')}, and ${wide}. <a href="/areas/">All areas</a></p>`
    : `<p>Across the North West${areas.length ? `: ${esc(andList(areas))}.` : '.'}</p>`);
  if (clean(business.hours)) lines.push(`<p>Calls: ${esc(business.hours)}</p>`);
  if (hasAddress) lines.push(`<address>${address.map(esc).join('<br>')}</address>`);
  const missing = [!areas.length && 'the towns you cover', !hasAddress && 'your business address'].filter(Boolean);
  if (missing.length) lines.push(note(`add ${andList(missing)} in your editor, under Business details.`));
  return lines.filter(Boolean).join(style === 'contact' ? '' : '\n      ');
}

const STAR = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 15l-5.4 3 1.2-6L1.3 7.8l6.1-.7z"/></svg>';
const stars = (n) => `<span class="stars" role="img" aria-label="${n} out of 5 stars">${STAR.repeat(n)}</span>`;
const prettyDate = (d) => { const t = new Date(d); return isNaN(t) ? '' : t.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); };

function reviewCard(r) {
  const n = Math.min(5, Math.max(1, Number(r.stars) || 5));
  return `<figure class="review">
          ${stars(n)}
          <blockquote>${esc(r.text).split(/\n\s*\n/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}</blockquote>
          <figcaption><b>${esc(r.name)}</b><span>Google review${prettyDate(r.date) ? `, ${prettyDate(r.date)}` : ''}</span></figcaption>
        </figure>`;
}

function googleButtons() {
  const b = [];
  if (reviewLink) b.push(`<a class="btn" href="${esc(reviewLink)}" rel="noopener">Leave a review on Google</a>`);
  if (profileLink) b.push(`<a class="btn btn--ghost" href="${esc(profileLink)}" rel="noopener">See all our reviews on Google</a>`);
  return b.length ? `<div class="review-btns">${b.join('')}</div>` : '';
}

// His rating on Google, when the build fetched it.
const ratingLine = () => (fromGoogle?.count
  ? `<p class="rating">${stars(Math.round(fromGoogle.rating))}<b>${fromGoogle.rating.toFixed(1)}</b> from ${fromGoogle.count} review${fromGoogle.count === 1 ? '' : 's'} on Google</p>` : '');

// Reviews page: his rating, the reviews, then the Google buttons.
function reviewsPage() {
  const list = reviews.length
    ? `<div class="reviews">${reviews.map(reviewCard).join('\n        ')}</div>`
    : '<p class="muted">Reviews from our customers on Google will be here soon.</p>';
  return `${ratingLine()}\n      ${list}\n      ${googleButtons()}`;
}

// Home page: the newest review, or nothing at all if there are none yet.
function reviewsHome(section) {
  if (!reviews.length && !googleButtons()) return '';
  return section.replace('{{reviews}}', reviews.length ? ratingLine() + reviewCard(reviews[0]) : googleButtons());
}

function aboutText() {
  const text = clean(aboutMe.text);
  if (!text) return note('a few lines in your own words go here. Add them in your editor, under Business details, About you.');
  return text.split(/\n\s*\n/).map((p) => `<p class="muted">${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n        ');
}

function aboutPhoto(R) {
  if (aboutMe.photo && hasPhoto(aboutMe.photo)) {
    return `<div class="photo" style="aspect-ratio: 4 / 3.2">${pic({ name: upName(aboutMe.photo), alt: 'Gaz and the TruDrive team', sizes: '(max-width: 760px) 67vw, (max-width: 960px) 100vw, 520px', focus: '50 40' }, R)}</div>`;
  }
  return '<div class="photo photo--todo" style="aspect-ratio: 4 / 3.2"><span>Photo of Gaz, the team or the van</span></div>';
}

// LocalBusiness data for Google and AI search tools, built only from facts the
// site states. No review or rating markup: Google ignores self-published
// reviews of a business on its own site, and it can count against it.
// The WebSite part gives Google the name to show above the result, so a
// search shows "TruDrive Driveways & Patios" rather than a bare address.
const BUSINESS_ID = () => `${SITE_URL}/#business`;
const SERVICES = [['Patio installation', 'patios/'], ['Driveway installation', 'driveways/'], ['Paths and steps', 'services/#paths'],
  ['Fencing', 'services/#fencing'], ['Turfing and artificial grass', 'services/#turf'], ['Garden walls and brickwork', 'services/#brickwork']];
const ldScript = (ld) => `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
function ldJson() {
  const biz = {
    '@type': 'HomeAndConstructionBusiness',
    '@id': BUSINESS_ID(),
    name: 'TruDrive Driveways & Patios',
    alternateName: ['TruDrive', 'Tru Drive', 'Tru Drive Driveways and Patios'],
    url: `${SITE_URL}/`,
    telephone: '+' + intl,
    image: `${SITE_URL}/img/og.jpg`,
    logo: `${SITE_URL}/img/logo.png`,
    description: `Driveway and patio installers${baseTown ? ` based in ${baseTown}` : ''}, covering the North West: porcelain and Indian sandstone patios, block paving, imprinted concrete, tarmac and gravel driveways, fencing, brickwork and turfing. Over 15 years' experience. Free, no-obligation quotes.`,
    areaServed: [...areaServedList(), ...areas.map((name) => ({ '@type': 'AdministrativeArea', name }))],
    knowsAbout: ['Driveways', 'Block paving', 'Imprinted concrete', 'Tarmac driveways', 'Gravel driveways', 'Porcelain patios', 'Indian sandstone patios', 'Fencing', 'Brickwork', 'Turfing'],
    sameAs: ['https://www.tiktok.com/@tru.drive', ...(facebook ? [facebook] : []), ...(profileLink ? [profileLink] : [])],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Driveways, patios and gardens',
      itemListElement: SERVICES.map(([name, page]) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name, url: `${SITE_URL}/${page}` } })),
    },
  };
  if (hasAddress) {
    biz.address = { '@type': 'PostalAddress', streetAddress: clean(business.street), addressLocality: clean(business.town), postalCode: clean(business.postcode).toUpperCase(), addressCountry: 'GB' };
  } else if (baseTown) {
    biz.address = { '@type': 'PostalAddress', addressLocality: baseTown, addressCountry: 'GB' };
  }
  const site = {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: 'TruDrive Driveways & Patios',
    alternateName: ['TruDrive', 'Tru Drive'],
    inLanguage: 'en-GB',
    publisher: { '@id': BUSINESS_ID() },
  };
  return ldScript({ '@context': 'https://schema.org', '@graph': [site, biz] });
}
// FAQPage data, read from the page's own questions (each <h3> and the <p>
// after it, inside the section marked data-faq), so the markup can never say
// something the page does not.
function faqJson(html) {
  const text = (s) => unesc(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  const faq = html.match(/<section\b[^>]*\bdata-faq\b[^>]*>([\s\S]*?)<\/section>/)?.[1] || '';
  const qa = [...faq.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)]
    .map(([, q, a]) => ({ '@type': 'Question', name: text(q), acceptedAnswer: { '@type': 'Answer', text: text(a) } }));
  return qa.length ? ldScript({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa }) : '';
}

// Where the business works, for the Service data on each page: the town he is
// based in, then the North West.
const areaServedList = () => [
  ...(baseTown ? [{ '@type': 'City', name: baseTown }] : []),
  ...TOWNS.map((t) => ({ '@type': 'City', name: t.name })),
  { '@type': 'AdministrativeArea', name: 'North West England' },
];

// The breadcrumb trail for a page, and the Service it is about when it is one.
//   <x-page-ld name="Patios" [service="Patio installation" [area="Standish"]] path="patios/" [parent="services/" parent-name="Services"]>
function pageLd(a) {
  const url = `${SITE_URL}/${a.path || ''}`;
  const trail = [{ name: 'Home', url: `${SITE_URL}/` }];
  if (a.parent) trail.push({ name: unesc(a['parent-name']), url: `${SITE_URL}/${a.parent}` });
  trail.push({ name: unesc(a.name), url });
  const graph = [{ '@type': 'BreadcrumbList', itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: t.url })) }];
  if (a.service) {
    const area = unesc(a.area || '');
    graph.push({ '@type': 'Service', '@id': `${url}#service`, name: unesc(a.service) + (area ? ` in ${area}` : ''), serviceType: unesc(a.service), url,
      provider: { '@id': BUSINESS_ID() }, areaServed: area ? [{ '@type': 'City', name: area }] : areaServedList() });
  }
  return ldScript({ '@context': 'https://schema.org', '@graph': graph });
}
const FOCUS = { middle: '50 50', low: '50 62', top: '50 30' };

// The editor checks the number's shape; this is the backstop if it is ever
// empty or mangled: the site keeps the number it launched with.
const LAUNCH_PHONE = '07923 485811';
let digits = String(business.phone || '').replace(/\D/g, '');
if (!/^(0|44)\d{9,10}$/.test(digits)) {
  warn(`phone number "${business.phone}" does not look right, using ${LAUNCH_PHONE}`);
  business.phone = LAUNCH_PHONE;
  digits = LAUNCH_PHONE.replace(/\D/g, '');
}
const intl = digits.startsWith('44') ? digits : '44' + digits.replace(/^0/, '');
const PHONE = { phone: esc(business.phone.trim()), tel: '+' + intl, wa: intl };

// If every job is deleted, the home page hero falls back to the launch photos.
const FALLBACK_HERO = { fixed: true, title: 'Decking to porcelain', before: 'j1-before', after: 'j1-after', crop: 'low',
  before_alt: 'Rotten timber decking down to a shed', after_alt: 'A grey porcelain patio down to the same shed, edged in black' };
const imgName = (job, k) => (job.fixed ? job[k] : upName(job[k]));

// slide: the home hero, plays once by itself (clean.js). show: a slide in the
// Our work reel, driven by gallery.js. Otherwise the plain fade toggle.
function ba(job, R, { slide = false, show = false, sizes, eager = false, style = '' }) {
  const focus = FOCUS[job.crop] || FOCUS.low;
  const label = `Before and after: ${esc(job.title)}`;
  const picAttrs = { sizes, focus, eager };
  const before = pic({ ...picAttrs, name: imgName(job, 'before'), class: 'ba__before', alt: `Before: ${esc(job.before_alt || job.title)}` }, R);
  const after = pic({ ...picAttrs, name: imgName(job, 'after'), class: 'ba__after', alt: `After: ${esc(job.after_alt || job.title)}` }, R);
  const open = slide
    ? `<div class="ba ba--slide" data-autoplay data-state="after" role="group" aria-label="${label}">`
    : show
      ? `<div class="ba ba--slide" data-start="after" data-state="after" role="group" aria-label="${label}">`
      : `<div class="ba ba--fade" data-start="after" role="group" aria-label="${label}"${style ? ` style="${style}"` : ''}>`;
  return `${open}
        ${before}
        ${after}
        <span class="ba__tag" aria-hidden="true">After</span>
        <div class="ba__switch"><button type="button" value="before" aria-pressed="false">Before</button><button type="button" value="after" aria-pressed="true">After</button></div>
      </div>`;
}

const kicker = (job) => esc(job.kind) + (job.town ? ` in ${esc(job.town)}` : '');
const workList = (job) => (Array.isArray(job.work) ? job.work : String(job.work || '').split('\n'))
  .map((w) => String(w).trim()).filter(Boolean);
const ticks = (job) => (workList(job).length
  ? `<ul class="ticks">${workList(job).map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '');
const about = (job) => (job.about ? `<p class="muted">${esc(job.about)}</p>` : '');

// The newest job ticked for the home page goes in the hero, the next one
// further down. If he has ticked fewer than two, the newest jobs fill in.
function homeJobs() {
  const picked = jobs.filter((j) => j.home);
  return [...picked, ...jobs.filter((j) => !j.home)].slice(0, 2);
}

function homeHero(R) {
  const [hero] = homeJobs();
  return ba(hero || FALLBACK_HERO, R, { slide: true, sizes: '(max-width: 760px) 67vw, (max-width: 960px) 100vw, 44vw', eager: true });
}

// The whole section between <x-job slot="feature"> and </x-job>, with its
// {{job}} filled in. With fewer than two jobs the section is left out.
function homeFeature(section, R) {
  const [, feature] = homeJobs();
  if (!feature) return '';
  return section.replace('{{job}}', `${ba(feature, R, { sizes: '(max-width: 760px) 67vw, (max-width: 960px) 100vw, 56vw', style: 'aspect-ratio: 4 / 3' })}
      <div class="split__txt">
        <p class="kicker">Before and after</p>
        <h2 id="ba-t">${esc(feature.title)}</h2>
        ${about(feature)}
        ${ticks(feature)}`);
}

// Each photo opens full screen (gallery.js) at the size the screen needs.
const lbAttrs = (name, title, line) => {
  const m = manifest[name];
  const I = '/' + (m.dir || 'img/');
  return `data-lb="image" data-srcset="${m.widths.map((w) => `${I}${name}-${w}.webp ${w}w`).join(', ')}" data-w="${m.w}" data-h="${m.h}" data-title="${esc(title)}" data-line="${esc(line || '')}"`;
};

// Every photo by default. A page about one thing can ask for just that kind,
// newest first: <x-photos kind="Patio" limit="6" half> (half: two to a row).
function photosList(R, { kind = '', limit = 0, half = false } = {}) {
  return photoFigures(photos.filter((p) => !kind || p.kind === kind).slice(0, limit || undefined), R, half);
}
function photoFigures(list, R, half = false) {
  const big = (i) => half || i < 2;
  return list.map((p, i) => `<figure${big(i) ? ' class="half"' : ''}${groupAttr(p.kind)}>
          <button class="ph" type="button" ${lbAttrs(upName(p.photo), p.title, p.line)} aria-label="Show bigger: ${esc(p.title)}">
            <span class="photo">${pic({ name: upName(p.photo), alt: esc(p.alt || p.title), sizes: big(i) ? '(max-width: 760px) 67vw, (max-width: 960px) 100vw, 560px' : '(max-width: 760px) 67vw, (max-width: 960px) 50vw, 420px', focus: FOCUS[p.crop] || FOCUS.low }, R)}</span>
          </button>
          <figcaption><b>${esc(p.title)}</b>${p.line ? `<span>${esc(p.line)}</span>` : ''}</figcaption>
        </figure>`).join('\n        ');
}

// ------------------------------------------------------------ Our work reel
// Every before and after, newest first, as one reel: gallery.js plays each
// from its before, slides the after across, holds, and moves on. Without
// JavaScript, or with reduced motion, it is a plain list with the switches.
const ICON = {
  prev: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pause: '<svg class="i-pause" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  play: '<svg class="i-play" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
};
const slugOf = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'job';
// Each before and after has its own page at /our-work/<slug>/, named from its title.
const jobSlugs = new Map();
for (const [i, job] of jobs.entries()) {
  let slug = slugOf(job.title);
  while ([...jobSlugs.values()].includes(slug)) slug += '-' + (i + 1);
  jobSlugs.set(job, slug);
}
const jobUrl = (job) => `/our-work/${jobSlugs.get(job)}/`;

function showcase(section, R) {
  if (!jobs.length) return '';
  const slides = jobs.map((job, i) => {
    const id = 'job-' + jobSlugs.get(job);
    return `<article class="show__slide" id="${id}"${groupAttr(job.kind)} aria-label="${esc(job.title)}">
          ${ba(job, R, { show: true, sizes: '(max-width: 760px) 67vw, (max-width: 960px) 100vw, 780px', eager: i === 0 })}
          <div class="show__txt">
            <p class="kicker">${kicker(job)}</p>
            <h3>${esc(job.title)}</h3>
            ${about(job)}
            ${ticks(job)}
            <a class="link" href="${jobUrl(job)}">This job on its own page ${ARROW}</a>
          </div>
        </article>`;
  });
  const thumbs = jobs.map((job, i) => `<button class="show__thumb" type="button" data-to="${i}"${groupAttr(job.kind)} aria-label="${esc(job.title)}">${pic({ name: imgName(job, 'after'), alt: '', sizes: '112px', focus: FOCUS[job.crop] || FOCUS.low }, R)}</button>`);
  return section.replace('{{showcase}}', `<div class="show" data-show>
        <div class="show__slides">
        ${slides.join('\n        ')}
        </div>
        <div class="show__bar" hidden>
          <div class="show__ctrl">
            <button class="show__btn" type="button" data-prev aria-label="Previous job">${ICON.prev}</button>
            <button class="show__btn" type="button" data-play aria-label="Pause">${ICON.pause}${ICON.play}</button>
            <button class="show__btn" type="button" data-next aria-label="Next job">${ICON.next}</button>
            <span class="show__count" aria-live="polite"></span>
          </div>
          <div class="show__thumbs" data-lenis-prevent-horizontal>${thumbs.join('')}</div>
        </div>
      </div>`);
}

// ------------------------------------------------------------------ videos
// Cards in a row. Desktop mice get a silent preview on hover; a tap or click
// plays it full screen with sound (gallery.js). TikTok ones play TikTok's own
// player, which loads only then.
const mmss = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
function videoCard(v, R) {
  const key = videoKey(v);
  const m = videoManifest[key];
  const poster = m.poster ? `${R}img/up/${key}-poster.webp` : '';
  const [w, h] = m.tiktok ? [720, 1280] : [m.w, m.h];
  const media = m.tiktok
    ? (poster ? `<img src="${poster}" width="${w}" height="${h}" alt="" loading="lazy" decoding="async">` : '<span class="vid__blank"></span>')
    : (poster ? `<img class="vid__cover" src="${poster}" width="${w}" height="${h}" alt="" loading="lazy" decoding="async">` : '')
      + `<video muted playsinline loop preload="${poster ? 'none' : 'metadata'}" width="${w}" height="${h}" ${poster ? 'data-src' : 'src'}="${R}img/up/${key}.mp4${poster ? '' : '#t=0.6'}"></video>`;
  const src = m.tiktok ? m.tiktok : `${R}img/up/${key}.mp4`;
  return `<li class="vid${h > w ? '' : ' vid--wide'}"${groupAttr(v.kind)}>
          <button class="vid__open" type="button" data-lb="${m.tiktok ? 'tiktok' : 'video'}" data-src="${src}" data-w="${w}" data-h="${h}"${poster ? ` data-poster="${poster}"` : ''} data-title="${esc(v.title)}" data-line="${esc(v.line || '')}" aria-label="Play the video: ${esc(v.title)}">
            ${media}
            <span class="vid__play" aria-hidden="true">${ICON.play}</span>
            ${m.seconds ? `<span class="vid__len">${mmss(m.seconds)}</span>` : ''}${m.tiktok ? '<span class="vid__len">TikTok</span>' : ''}
          </button>
          <p class="vid__t"><b>${esc(v.title)}</b>${v.line ? `<span>${esc(v.line)}</span>` : ''}</p>
        </li>`;
}

// The home page shows four: the ones he switched on first, then the newest.
function videosSection(section, R, home) {
  const list = home ? [...videos.filter((v) => v.home), ...videos.filter((v) => !v.home)].slice(0, 4) : videos;
  if (!list.length) return '';
  return section.replace('{{videos}}', `<ul class="vids" data-lenis-prevent-horizontal>
        ${list.map((v) => videoCard(v, R)).join('\n        ')}
      </ul>`);
}

// Filter buttons for the groups that have something in them. With everything
// in one group there is nothing to filter, so none.
function filters() {
  const count = Object.fromEntries(GROUPS.map(([g]) => [g, 0]));
  for (const x of [...jobs, ...photos, ...videos]) if (groupOf(x.kind)) count[groupOf(x.kind)]++;
  const present = GROUPS.filter(([g]) => count[g]);
  if (present.length < 2) return '';
  return `<div class="filters" data-filters role="group" aria-label="Show" hidden>
        <button type="button" data-filter="" aria-pressed="true">All</button>
        ${present.map(([g, label]) => `<button type="button" data-filter="${g}" aria-pressed="false">${label}</button>`).join('\n        ')}
      </div>`;
}

const attrs = (s) => {
  const out = {};
  for (const m of s.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) out[m[1]] = m[2] ?? true;
  return out;
};

function pic(a, R) {
  const m = manifest[a.name];
  if (!m) throw new Error(`no image called ${a.name}`);
  const I = R + (m.dir || 'img/');
  const srcset = m.widths.map((w) => `${I}${a.name}-${w}.webp ${w}w`).join(', ');
  const lazy = a.eager ? 'fetchpriority="high"' : 'loading="lazy"';
  const cls = a.class ? ` class="${a.class}"` : '';
  const focus = a.focus ? ` data-focus="${a.focus}"` : '';
  const pos = a.focus ? ` style="object-position:${a.focus.split(' ').map((v) => v + '%').join(' ')}"` : '';
  if (a.plain) {
    // Canvas sources. No w-descriptor srcset: with one, naturalWidth reports
    // CSS pixels instead of the file's pixels and drawImage crops short.
    const big = Math.max(...m.widths.filter((w) => w <= 1600));
    const mob = a.mobile ? manifest[a.mobile] : m;
    const mobName = a.mobile || a.name;
    const mobW = mob.widths.includes(800) ? 800 : Math.max(...mob.widths);
    const mfocus = a['focus-mobile'] ? ` data-focus-mobile="${a['focus-mobile']}"` : '';
    return `<picture><source media="(max-width: 860px)" srcset="${R}img/${mobName}-${mobW}.webp"><img${cls} src="${R}img/${a.name}-${big}.webp" width="${m.w}" height="${m.h}" alt="${a.alt}" loading="lazy" decoding="async"${focus}${mfocus}></picture>`;
  }
  let mobileSource = '';
  if (a.mobile) {
    // A different photo on phones: portrait pairs suit a phone, landscape a desktop.
    const mm = manifest[a.mobile];
    mobileSource = `<source media="(max-width: 860px)" type="image/webp" srcset="${mm.widths.map((w) => `${R}img/${a.mobile}-${w}.webp ${w}w`).join(', ')}" sizes="100vw">`;
  }
  return `<picture>${mobileSource}<source type="image/webp" srcset="${srcset}" sizes="${a.sizes || '100vw'}"><img${cls} src="${I}${a.name}.jpg" width="${m.w}" height="${m.h}" alt="${a.alt}" ${lazy} decoding="async"${focus}${pos}></picture>`;
}

function head(a, R) {
  const url = `${SITE_URL}/${a.path || ''}`;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${a.title}</title>
<meta name="description" content="${a.desc}">
<meta name="robots" content="${a.noindex ? 'noindex' : '{{robots}}'}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_GB">
<meta property="og:site_name" content="TruDrive Driveways &amp; Patios">
<meta property="og:title" content="${a.title}">
<meta property="og:description" content="${a.desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_URL}${a.image || '/img/og.jpg'}">
<meta property="og:image:width" content="${a['image-w'] || 1200}">
<meta property="og:image:height" content="${a['image-h'] || 630}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="${R}img/favicon.png">
<link rel="apple-touch-icon" href="${R}img/apple-touch-icon.png">
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>`;
}

function include(a, R) {
  let html = fs.readFileSync(path.join('pages', a.file), 'utf8');
  if (a.active) html = html.replace(`data-nav="${a.active}"`, `data-nav="${a.active}" aria-current="page"`);
  return html;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}

// ------------------------------------------------------------------ towns
// A town page shows the jobs and photos Gaz tagged with that town (or a place
// in it) first, then a different handful of recent photos on each page.
function townWork(t, R) {
  const names = new Set([t.name, ...t.places].map((n) => n.toLowerCase()));
  const inTown = (x) => names.has(clean(x.town).toLowerCase());
  const localJobs = jobs.filter(inTown).slice(0, 2);
  const local = photos.filter(inTown);
  const rest = photos.filter((p) => !inTown(p));
  const at = rest.length ? (TOWNS.indexOf(t) * 3) % rest.length : 0;
  const shown = [...local, ...rest.slice(at), ...rest.slice(0, at)].slice(0, 4);
  if (!localJobs.length && !shown.length) return '';
  const here = localJobs.length || local.length;
  const jobsHtml = localJobs.map((job) => `<div class="split split--wide-img town-job">
        ${ba(job, R, { sizes: '(max-width: 760px) 67vw, (max-width: 960px) 100vw, 56vw', style: 'aspect-ratio: 4 / 3' })}
        <div class="split__txt">
          <p class="kicker">${kicker(job)}</p>
          <h3>${esc(job.title)}</h3>
          ${about(job)}
          ${ticks(job)}
        </div>
      </div>`).join('\n      ');
  return `<section class="sec sec--paper" aria-labelledby="work-t">
    <div class="wrap">
      <div class="sec__head sec__head--row">
        <div style="display:grid;gap:14px;max-width:40rem">
          <h2 id="work-t">${here ? `Our work in ${esc(t.name)}` : 'Some of our recent work'}</h2>
          <p class="lead">${here ? 'Jobs we have done here.' : 'Real jobs, laid by us.'} Tap a photo to see it bigger.</p>
        </div>
        <a class="link" href="${R}our-work/">All our work ${ARROW}</a>
      </div>
      ${jobsHtml}
      <div class="gallery">
        ${photoFigures(shown, R, true)}
      </div>
    </div>
  </section>`;
}

// The Areas page: the towns near Wigan, grouped by council area, nearest first.
function townCards() {
  return Object.entries(COUNCILS).map(([key, c]) => {
    const list = TOWNS.filter((t) => t.council === key).sort(byMiles);
    return list.length ? `<div class="towns-group">
        <h3>${esc(c.group || c.name)}</h3>
        <div class="towns">${list.map(townLink).join('')}</div>
      </div>` : '';
  }).filter(Boolean).join('\n      ');
}

const quote = fs.readFileSync('pages/_quote.html', 'utf8');
const built = [];

// Fills in every tag on a page. Links start from the site root, so the 404
// page works at any address. `town` is set for a town page.
function render(html, town) {
  const R = '/';
  // Partials first, so tags inside the header and footer are filled in too.
  html = html.replace(/<x-include\s+([^>]*?)\s*\/?>(?:<\/x-include>)?/g, (_, s) => include(attrs(s), R));
  html = html.replace(/<x-ldjson\s*\/?>(?:<\/x-ldjson>)?/g, () => ldJson());
  html = html.replace(/<x-where\s*(contact)?\s*\/?>(?:<\/x-where>)?/g, (_, style) => where(style));
  html = html.replace(/<x-reviews\s+home>([\s\S]*?)<\/x-reviews>/g, (_, section) => reviewsHome(section));
  html = html.replace(/<x-reviews\s*\/?>(?:<\/x-reviews>)?/g, () => reviewsPage());
  html = html.replace(/<x-address\s*\/?>(?:<\/x-address>)?/g, () => (hasAddress
    ? `<address>TruDrive Driveways &amp; Patios<br>${address.map(esc).join('<br>')}</address>`
    : `<address>TruDrive Driveways &amp; Patios${baseTown ? `<br>${esc(baseTown)}` : ''}</address>${note('add your business address in your editor, under Business details.')}`));
  // Links to his pages elsewhere, left out while he has none.
  html = html.replace(/<li data-facebook>([\s\S]*?)<\/li>/g, (_, inner) => (facebook ? `<li>${inner.replaceAll('{{facebook}}', esc(facebook))}</li>` : ''));
  html = html.replace(/<x-about-text\s*\/?>(?:<\/x-about-text>)?/g, () => aboutText());
  html = html.replace(/<x-about-photo\s*\/?>(?:<\/x-about-photo>)?/g, () => aboutPhoto(R));
  html = html.replaceAll('{{year}}', String(new Date().getFullYear()));
  html = html.replace(/<x-pic\s+([^>]*?)\s*\/?>(?:<\/x-pic>)?/g, (_, s) => pic(attrs(s), R));
  html = html.replace(/<x-head\s+([^>]*?)\s*\/?>(?:<\/x-head>)?/g, (_, s) => head(attrs(s), R));
  html = html.replace(/<x-quote\s*\/?>(?:<\/x-quote>)?/g, quote);
  html = html.replace(/<x-job\s+slot="feature">([\s\S]*?)<\/x-job>/g, (_, section) => homeFeature(section, R));
  html = html.replace(/<x-job\s+slot="hero"\s*\/?>(?:<\/x-job>)?/g, () => homeHero(R));
  html = html.replace(/<x-photos([^>]*?)\s*\/?>(?:<\/x-photos>)?/g, (_, s) => {
    const a = attrs(s);
    return photosList(R, { kind: a.kind || '', limit: Number(a.limit) || 0, half: Boolean(a.half) });
  });
  html = html.replace(/<x-page-ld\s+([^>]*?)\s*\/?>(?:<\/x-page-ld>)?/g, (_, s) => pageLd(attrs(s)));
  html = html.replace(/<x-town-work\s*\/?>(?:<\/x-town-work>)?/g, () => (town ? townWork(town, R) : ''));
  html = html.replace(/<x-town-cards\s*\/?>(?:<\/x-town-cards>)?/g, () => townCards());
  html = html.replaceAll('{{homePlaces}}', esc(andList(HOME.places || [])));
  html = html.replace(/<x-filters\s*\/?>(?:<\/x-filters>)?/g, () => filters());
  html = html.replace(/<x-showcase>([\s\S]*?)<\/x-showcase>/g, (_, section) => showcase(section, R));
  html = html.replace(/<x-videos(\s+home)?>([\s\S]*?)<\/x-videos>/g, (_, home, section) => videosSection(section, R, Boolean(home)));
  html = html.replace(/{{(phone|tel|wa)}}/g, (_, k) => PHONE[k]);
  html = html.replace(/<x-faq-ld\s*\/?>(?:<\/x-faq-ld>)?/g, () => faqJson(html));
  html = html.replaceAll('{{root}}', R);
  return html;
}

for (const file of walk('pages')) {
  const base = path.basename(file);
  if (!base.endsWith('.html') || base.startsWith('_')) continue;
  const rel = path.relative('pages', file).replace(/\\/g, '/').replace(/\.html$/, '');
  const outRel = rel === 'index' ? '' : rel.endsWith('/index') ? rel.slice(0, -'/index'.length) : rel;
  const html = render(fs.readFileSync(file, 'utf8'));
  // Cloudflare serves /404.html for any address that does not exist.
  const out = rel === '404' ? path.join('site', '404.html') : path.join('site', outRel, 'index.html');
  built.push({ out, html, url: `${SITE_URL}/${outRel ? outRel + '/' : ''}`, listed: rel !== '404' });
}

// A page for each town near Wigan: pages/_town.html filled in from content/towns.json.
const townPage = fs.readFileSync('pages/_town.html', 'utf8');
for (const t of TOWNS) {
  const council = COUNCILS[t.council];
  const fill = { town: t.name, slug: t.slug, intro: t.intro, miles: t.miles, places: andList(t.places), postcodes: t.postcodes,
    kerb: String(council.kerb || '').replaceAll('{town}', t.name), councilName: council.name, councilUrl: council.url, planning: t.planning };
  const html = render(townPage
    .replace(/{{(town|slug|intro|miles|places|postcodes|kerb|councilName|councilUrl|planning)}}/g, (_, k) => esc(fill[k] ?? ''))
    .replace('{{nearLinks}}', t.near.map((n) => townBySlug[n]).filter(Boolean).map(townLink).join('')), t);
  built.push({ out: path.join('site', 'areas', t.slug, 'index.html'), html, url: `${SITE_URL}/areas/${t.slug}/`, listed: true });
}

// A page for each before and after: pages/_job.html filled in from the job.
// With a town on the job, the page is about that town too, and links to it.
const SERVICE_OF = { Driveway: ['driveways/', 'More about driveways'], Fencing: ['services/#fencing', 'More about fencing'],
  Turf: ['services/#turf', 'More about turfing'], 'Path and steps': ['services/#paths', 'More about paths and steps'] };
const townOf = (name) => TOWNS.find((t) => [t.name, ...t.places].some((n) => n.toLowerCase() === clean(name).toLowerCase()));
const jobPage = fs.readFileSync('pages/_job.html', 'utf8');
for (const job of jobs) {
  const slug = jobSlugs.get(job);
  const town = clean(job.town);
  const heading = esc(job.title) + (town ? ` in ${esc(town)}` : '');
  const after = manifest[imgName(job, 'after')];
  const [svcPath, svcLabel] = SERVICE_OF[job.kind] || ['patios/', 'More about patios'];
  const t = town && townOf(town);
  const links = [`<a class="link" href="/${svcPath}">${svcLabel} ${ARROW}</a>`,
    ...(t ? [`<a class="link" href="/areas/${t.slug}/">Driveways and patios in ${esc(t.name)} ${ARROW}</a>`] : [])];
  const others = jobs.filter((j) => j !== job).slice(0, 3)
    .map((j) => `<a class="town" href="${jobUrl(j)}"><b>${esc(j.title)}</b><span>${kicker(j)}</span></a>`).join('');
  const desc = `Before and after: ${job.title}${town ? ` in ${town}` : ''}. ${clean(job.about)} Laid by TruDrive, driveway and patio installers based in Wigan.`.replace(/\s+/g, ' ');
  const html = render(jobPage
    .replace(/{{(jobHeading|jobTitle|jobSlug|jobDesc|jobImage|jobImageW|jobImageH)}}/g, (_, k) => ({
      jobHeading: heading, jobTitle: esc(job.title), jobSlug: slug, jobDesc: esc(desc),
      jobImage: `/${after.dir || 'img/'}${imgName(job, 'after')}.jpg`, jobImageW: after.w, jobImageH: after.h,
    })[k])
    .replace('{{jobKicker}}', kicker(job))
    .replace('{{jobAbout}}', job.about ? `<p class="lead">${esc(job.about)}</p>` : '')
    .replace('{{jobBa}}', ba(job, '/', { sizes: '(max-width: 760px) 67vw, (max-width: 960px) 100vw, 56vw', eager: true, style: 'aspect-ratio: 4 / 3' }))
    .replace('{{jobTicks}}', ticks(job) || '<p class="muted">Ask Gaz about this one: ring or send a message on WhatsApp.</p>')
    .replace('{{jobLinks}}', links.join(''))
    .replace('{{otherJobs}}', others));
  built.push({ out: path.join('site', 'our-work', slug, 'index.html'), html, url: `${SITE_URL}/our-work/${slug}/`, listed: true });
}

// The live site is open to Google, Bing and the AI search tools; a local or
// preview build is kept out of all of them. Anything Gaz still has to fill in
// is listed in the log above and shown as a yellow note on the local preview.
const unfinished = built.filter((b) => b.html.includes('class="demo-note"')).map((b) => b.out);
if (unfinished.length) warn(`yellow notes for Gaz on the preview: ${unfinished.join(', ')}`);
const indexable = LIVE;
for (const b of built) {
  fs.mkdirSync(path.dirname(b.out), { recursive: true });
  fs.writeFileSync(b.out, b.html.replaceAll('{{robots}}', indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'));
  console.log('built', b.out);
}

// The sitemap lists every page with its photos and videos, so Google Images
// and video results can find them.
function sitemapEntry(b) {
  const main = b.html.split('<main')[1]?.split('</main>')[0] || '';
  const imgs = [...new Set([...main.matchAll(/<img\b[^>]*?\ssrc="(\/img\/[^"]+)"/g)].map((m) => m[1]))];
  const vids = [...main.matchAll(/<button class="vid__open"([^>]*)>/g)].map((m) => attrs(m[1])).filter((a) => a['data-lb'] === 'video' && a['data-poster']);
  const lines = [`  <url>`, `    <loc>${xml(b.url)}</loc>`];
  for (const src of imgs) lines.push(`    <image:image><image:loc>${xml(SITE_URL + src)}</image:loc></image:image>`);
  for (const v of vids) {
    const key = path.basename(v['data-src'], '.mp4');
    const m = videoManifest[key] || {};
    const title = unesc(v['data-title']);
    lines.push('    <video:video>',
      `      <video:thumbnail_loc>${xml(SITE_URL + v['data-poster'])}</video:thumbnail_loc>`,
      `      <video:title>${xml(title)}</video:title>`,
      `      <video:description>${xml(unesc(v['data-line']) || title)}, by TruDrive Driveways &amp; Patios</video:description>`,
      `      <video:content_loc>${xml(SITE_URL + v['data-src'])}</video:content_loc>`,
      ...(m.seconds ? [`      <video:duration>${Math.round(m.seconds)}</video:duration>`] : []),
      '    </video:video>');
  }
  lines.push('  </url>');
  return lines.join('\n');
}
fs.writeFileSync('site/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${built.filter((b) => b.listed).map(sitemapEntry).join('\n')}
</urlset>
`);
fs.writeFileSync('site/robots.txt', indexable
  ? `# Search engines and AI search tools are welcome. Only the editor is off limits.\nUser-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n');

// A plain summary for AI search tools (llms.txt), from the same facts as the pages.
fs.writeFileSync('site/llms.txt', `# TruDrive Driveways & Patios

> Driveway and patio installers${baseTown ? ` based in ${baseTown}` : ''}, covering ${baseTown ? `${baseTown} and ` : ''}North West England: Greater Manchester, Merseyside, Lancashire, Cheshire and Cumbria. Run by Gaz, with over 15 years' experience. Free, no-obligation quotes: send photos on WhatsApp or ring.

- Name: TruDrive Driveways & Patios (also written TruDrive or Tru Drive). Not connected to trudrive.com, which is a different business.
- Phone and WhatsApp: ${business.phone}
${hasAddress ? `- Address: ${address.join(', ')}\n` : ''}- Driveways: block paving, imprinted concrete, tarmac, gravel
- Patios: porcelain, Indian sandstone, crazy paving
- Also: paths and steps, fencing, brickwork, turfing and artificial grass
- TikTok: https://www.tiktok.com/@tru.drive
${facebook ? `- Facebook: ${facebook}\n` : ''}
## Pages

- [Services](${SITE_URL}/services/)
- [Areas we cover](${SITE_URL}/areas/)
- [Our work](${SITE_URL}/our-work/): before and after photos and videos
- [About](${SITE_URL}/about/)
- [Reviews](${SITE_URL}/reviews/)
- [Free quote](${SITE_URL}/contact/)
${TOWNS.length ? `
## Towns near ${HOME.name}

${[...TOWNS].sort(byMiles).map((t) => `- [Driveways and patios in ${t.name}](${SITE_URL}/areas/${t.slug}/): ${andList(t.places)}, about ${t.miles} miles from ${HOME.name}`).join('\n')}
` : ''}`);

// Short links for printed QR codes (scripts/qr.mjs). The QR holds his own
// address, so a card printed today still works if the Google link changes:
// he pastes the new one in his editor and /review follows it. 302, not 301,
// so phones never remember an old destination. Cloudflare Pages reads this file.
fs.writeFileSync('site/_redirects', `# Made by scripts/build.mjs from content/google.json. Edits here are overwritten.
/review ${reviewLink || '/reviews/'} 302
/quote /contact/ 302
`);

// The quote sheet script carries the number too, for the WhatsApp message it opens.
const partsPath = 'site/assets/parts.js';
const parts = fs.readFileSync(partsPath, 'utf8')
  .replace(/var PHONE_DISPLAY = '[^']*';/, `var PHONE_DISPLAY = '${business.phone.trim().replace(/[^\d +]/g, '')}';`)
  .replace(/var PHONE_INTL = '[^']*';/, `var PHONE_INTL = '${PHONE.wa}';`);
fs.writeFileSync(partsPath, parts);
