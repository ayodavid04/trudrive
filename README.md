# TruDrive Driveways & Patios: website

The website for TruDrive Driveways & Patios. A plain static site: no server,
database or plugins, nothing to update or renew except the domain.

## For Gaz

You edit your website at **your-domain/admin**. Your guide is
`guide/TruDrive-website-guide.pdf`.

## How it works

- **Editing:** `/admin` is Sveltia CMS (`site/admin/`, config in
  `site/admin/config.yml`), signed in with GitHub. It edits:
  - before and afters (`content/jobs/`), finished photos (`content/photos/`)
    and reviews copied word for word from Google (`content/reviews/`)
  - business details: phone, towns, hours, address (`content/business.json`),
    Google links (`content/google.json`), About text and photo (`content/about.json`)
- **Photos** upload to `site/uploads/`, shrunk to 2400 px WebP on the phone first.
- **Every save is a commit.** Cloudflare Pages builds each commit with
  `npm run build` and publishes it in about a minute. A failed build leaves the
  live site as it was.
- **The build:** `scripts/content.mjs` makes the photo sizes (`site/img/up/`,
  not committed), then `scripts/build.mjs` writes the pages from `pages/` into
  `site/`, plus `sitemap.xml` and `robots.txt`. Anything it cannot read is left
  off with a `WARNING:` line instead of stopping the build.
- **Search engines:** while a yellow "For Gaz" note is still on the site
  (something missing from Business details), every page is `noindex` and
  robots.txt blocks crawling. Once the details are filled in, the next build
  opens the site to search engines by itself.

## Hosting

- Cloudflare Pages, connected to this GitHub repo. Build command
  `npm run build`, output directory `site`, Node 22 (`.node-version`).
- Environment variable `SITE_URL` = `https://your-domain` (used for canonical
  links, share previews and the sitemap).
- Editor sign-in goes through Sveltia's authenticator, a free Cloudflare Worker
  (https://github.com/sveltia/sveltia-cms-auth). Its address is `base_url` in
  `site/admin/config.yml`.
- The domain is in Cloudflare Registrar on auto-renew. **It is the only thing
  that can take the site offline if it lapses.**

## Working on it locally

- `npm install`, `npm run build`, then `node scripts/serve.mjs --root site --port 4600`.
- Editor locally: open `localhost:4600/admin/` in Chrome or Edge, "Work with
  Local Repository", pick this folder.
- Checks (with the server running): `node scripts/check-launch.mjs` (search
  tags, links, headings, alt text, page weight, phone width, console errors,
  reduced motion, 404, sitemap) and `node scripts/test-clean.mjs` (before and
  after sliders, quote sheet, navigation).
- Update the editor: `npm pack @sveltia/cms@<version>`, copy
  `dist/sveltia-cms.js` and `dist/chunks/` into `site/admin/`, check `/admin`
  loads and saves.
