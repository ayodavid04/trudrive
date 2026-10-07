# TruDrive: handing the site to Gaz

Gaz owns everything, updates his own jobs, and never needs Travinyx to keep
the site running. This is how it fits together, what is still missing before
launch, and what to set up on handover day.

## How it works

- **Gaz edits at `/admin`** (Sveltia CMS, config in `site/admin/config.yml`).
  He can add, change and remove:
  - **Before and afters** (`content/jobs/`): title, before photo, after photo,
    date, type, "put it on the home page", and optional town, description,
    what went in.
  - **Finished photos** (`content/photos/`): the gallery under the before and afters.
  - **Business details** (`content/business.json`): his phone number, used on
    every page and by the WhatsApp buttons.
- Photos are shrunk to 2400 px WebP on his phone before they upload, and land
  in `site/uploads/`.
- **Every save is a commit** to his GitHub repo. Cloudflare Pages builds it
  with `npm run build` (`scripts/content.mjs` makes the photo sizes, then
  `scripts/build.mjs` writes the pages) and it is live in about a minute.
- The newest job switched on for the home page goes in the hero, the next one
  further down. With fewer than two, the newest jobs fill in.
- Layout, services and about text stay fixed so he cannot break the design.

## Why it stays up

- **Hosting is Cloudflare Pages, free plan:** unlimited bandwidth and visits
  for a static site, 500 builds a month. Nothing meters out and pauses it.
  (Netlify was dropped: its free plan is now 300 credits a month, every save is
  a production deploy, and running out pauses publishing.)
- **It is a plain static site.** No server, database, plugins or updates. There
  is nothing on it that can crash, get hacked through a plugin, or go stale.
- **A failed build never replaces the live site**, and the build skips anything
  it cannot read with a `WARNING:` line instead of failing, so one bad save
  never blocks the next.
- **The editor is stored on his own site** (`site/admin/sveltia-cms.js`, Sveltia
  0.230.1), not loaded from a CDN, so it works as long as the site does and
  never changes under him.
- **The only outside services the pages use** are Fontshare for the Satoshi
  font (if it is ever down, the site shows a standard font and works) and
  WhatsApp/phone links.
- **The one thing that can take it offline is the domain expiring.** It sits in
  his Cloudflare account on auto-renew; his guide says so in bold.

## Dummy-proofing (what Gaz cannot get wrong)

- **A job cannot save without a title, a before photo and an after photo.**
  The editor blocks it with red messages.
- **Character limits** with a counter, so nothing he types wrecks the layout.
- **The phone number is checked** before it saves (UK, starting 0). If it is
  ever empty or mangled anyway, the build keeps the launch number.
- **Photos of any size are fine.** Names like `IMG 4821.JPG` become
  `img-4821.webp`, and a repeat name is saved as `-1`, never over the old photo.
- **One bad job never blocks the rest**: an unreadable photo (HEIC, video,
  broken upload), a missing photo or a broken file is left off with a warning.
- **Deleting everything is safe**: the hero falls back to the launch photos.
- **Fewer wrong turns:** the developer sign-in and developer menu items are
  hidden. He sees his logo and "TruDrive website".
- **His guide** (`guide/TruDrive-website-guide.pdf`): six steps with real
  phone screenshots, fixing a job that has not shown up, and a page on what he
  owns and the one thing to keep an eye on. It never sends him to Travinyx.
  Before sending: replace `yourwebsite.co.uk` in `guide/index.html` with his
  domain, then `node scripts/guide-pdf.mjs`.

## Still to do before launch

**Done:** Clean is the whole site at `/` (the other looks are in git history),
privacy page, 404 page, sitemap.xml, robots.txt, LocalBusiness data for Google,
logo cut from 200 KB to 35 KB, and `node scripts/check-launch.mjs` passes the
travinyx-site delivery gate on every page at desktop and phone size.

**Gaz types these into his editor himself** (Business details), and each one
fills its place on the site. The yellow notes disappear as he does:

- [ ] **Business address** (legal requirement; a registered office service is fine)
- [ ] **Towns he covers**, and the hours he takes calls
- [ ] **About you:** a few lines in his own words, and a photo
- [ ] **Google review link and Maps link**, once the Business Profile exists
- [ ] **His original photos** in place of the TikTok ones
- [ ] Check the job descriptions written from his photos, and the privacy
  page's wording about how long he keeps customer details

**The site stays out of Google automatically** while any yellow note is left
(every page `noindex`, robots.txt blocking everything). When the last one is
filled in, the next build opens it to Google and robots.txt points at the
sitemap. Nothing to switch on by hand.

## Google Business Profile (you are setting this up)

For a local trade this matters more than the website: it is what shows in the
map results when someone searches "driveways near me".

1. Make it with **Gaz's own Google account**, so he is the owner from day one.
2. **Name: exactly "TruDrive Driveways & Patios".** No towns or keywords added
   to the name. Google suspends profiles for that.
3. **He goes to customers, so it is a service-area business:** say no to
   "a location customers can visit", then add the towns he covers (up to 20).
   His address stays hidden on Google but is still needed for verification and
   on the website by law.
4. **Category:** primary "Paving contractor" if it is offered; add others that
   are true, like Landscaper or Fence contractor. Pick from Google's list.
5. **Phone and website exactly as on the site.** Same name, number and
   address everywhere (Facebook, Checkatrade, Yell) is a ranking signal.
6. **Verification** is usually a short video: the van, tools, a job, proof he
   runs the business. It can take a few days.
7. Add his before and after photos, and post a job now and then.
8. Once it is live: **"Ask for reviews"** gives the review link, and "Share"
   on Google Maps gives the profile link. Both go into his editor under
   Business details, Google reviews links. Text the review link to every
   customer after a job, and reply to every review.
9. Never buy reviews, offer anything for them, or only ask happy customers.
   Google removes them and the CMA can fine for fake reviews.

**After the domain is live:** add it to Google Search Console in his Google
account (Cloudflare can verify it in one click) and submit
`https://his-domain/sitemap.xml`. Then import it into Bing Webmaster Tools from
Search Console in two clicks; Bing also feeds Copilot and ChatGPT search.

## Handover day, in this order

Do it with him, on his phone, so every account is his and he has logged in
once. Two accounts in total: Cloudflare and GitHub.

1. **Cloudflare account** in his name and email, his phone for two-step login.
   Register the domain in Cloudflare Registrar (sells .co.uk at cost, a few
   pounds a year), his card, **auto-renew on**.
2. **GitHub account** for him. GitHub makes him set up two-step login: do it
   together with the GitHub Mobile app. Transfer this repo to his account
   (Settings > Transfer ownership), so the history comes with it.
3. **Hosting:** in his Cloudflare, Workers & Pages > Create > Pages > Connect to
   Git > his repo. Build command `npm run build`, output directory `site`,
   environment variable `SITE_URL` = `https://his-domain`. Then Custom domains >
   add his domain.
4. **Editor login:** deploy Sveltia's authenticator to his Cloudflare with the
   deploy button at https://github.com/sveltia/sveltia-cms-auth. On GitHub (his
   account): Settings > Developer settings > OAuth Apps > New OAuth App,
   callback URL `<worker URL>/callback`. In the Worker's settings add
   `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (encrypted) and
   `ALLOWED_DOMAINS` = his domain.
5. In `site/admin/config.yml` set `repo:` to his `username/trudrive` and
   `base_url:` to the Worker's URL. Commit and wait for the build.
6. **He adds a real job himself** at `his-domain/admin`, following the guide,
   not you. Add `/admin` to his home screen and send him the PDF.
7. Google Business Profile: him as owner.
8. **Take yourself off.** Remove your access from his GitHub repo and
   Cloudflare if you were added while setting up. Nothing should depend on you.

## Legal

The invoice or agreement says: on full payment, all rights in the site's
design, code and content pass to Gaz; Travinyx may show the site in its
portfolio.

## Developer notes

- `npm run build` locally, then the `trudrive` preview (port 4600). Locally
  `SITE_URL` defaults to localhost; on Cloudflare without it, the build uses
  the project's `pages.dev` address and warns.
- Test the editor locally in Chrome or Edge: `localhost:4600/admin/`, "Work
  with Local Repository", pick this folder. Saves write straight to `content/`
  and `site/uploads/`.
- `site/img/up/` is made at build time and is not committed.
- Update the editor: `npm pack @sveltia/cms@<version>`, copy
  `dist/sveltia-cms.js` and `dist/chunks/` into `site/admin/`, check `/admin`
  loads and saves, `node scripts/guide-shots.mjs`, `node scripts/guide-pdf.mjs`.
- The fixed photos elsewhere on the site still come from `scripts/images.py`.
- The old demo at trudrive-looks-b37345.netlify.app is on your Netlify,
  deployed by CLI. It has nothing to do with his site.
- Checks: `node scripts/check-launch.mjs` (the delivery gate: SEO tags, links,
  headings, alt text, page weight, phone width, console errors, reduced motion,
  404, sitemap) and `node scripts/test-clean.mjs` (sliders, quote sheet, nav).
  Both need `npm run build` and the preview running.
