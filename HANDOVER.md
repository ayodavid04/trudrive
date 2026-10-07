# TruDrive: handing the site to Gaz

Gaz owns everything and updates his own jobs. This is how it fits together and
what to set up on handover day.

## How it works

- **Gaz edits at `/admin`** (Sveltia CMS, config in `site/admin/config.yml`).
  He can add, change and remove:
  - **Before and afters** (`content/jobs/`): title, date, type, town, before
    photo, after photo, a line about it, what went in, "show on the home page".
  - **Finished photos** (`content/photos/`): the gallery under the before and afters.
  - **Business details** (`content/business.json`): his phone number, used on
    every page and by the WhatsApp buttons.
- Photos are shrunk to 2400 px WebP on his phone before they upload, and land
  in `site/uploads/`.
- **Every save is a commit** to his GitHub repo. Netlify builds it with
  `npm run build` (`scripts/content.mjs` makes the photo sizes, then
  `scripts/build.mjs` writes the pages) and it is live in about a minute.
- **A failed build never replaces the live site.** If a save ever breaks the
  build, the old site stays up and the Netlify deploy log says why.
- The newest job ticked "show on the home page" goes in the home page hero, the
  next one in the before and after section further down. With fewer than two
  ticked, the newest jobs fill in.
- Everything else (layout, services, about text) stays fixed so he cannot
  break the design. Changes there are paid work.

## Dummy-proofing (what Gaz cannot get wrong)

- **A job cannot save without a title, a before photo and an after photo.**
  The editor blocks it with red messages.
- **Titles and text have character limits** with a counter, so nothing he
  types can wreck the layout.
- **The phone number is checked** before it saves (a UK number starting 0). If
  it is ever empty or mangled anyway, the build keeps the launch number.
- **Photos of any size are fine.** They are shrunk on his phone before upload.
  Phone names like `IMG 4821.JPG` are cleaned to `img-4821.webp`, and an upload
  with the same name as an old photo is saved as `-1`, never over the old one.
- **One bad job never blocks the rest.** A photo that will not open (a HEIC or
  video that slipped through, a broken upload), a missing photo, or a broken
  file is left off the site with a `WARNING:` line in the Netlify deploy log;
  everything else still goes live.
- **Deleting everything is safe.** With no jobs the home page hero falls back
  to the launch photos and the second before and after section is left out.
- **Fewer wrong turns:** the developer sign-in and the developer menu items
  (Slug, Validation, Clear All...) are hidden. He sees his logo and "TruDrive
  website", not Sveltia.
- **His guide:** `guide/TruDrive-website-guide.pdf`, six steps with real
  screenshots. Before sending it, replace `yourwebsite.co.uk` in
  `guide/index.html` with his domain and run `node scripts/guide-pdf.mjs`.
  After a Sveltia update, rerun `node scripts/guide-shots.mjs` first.

## Before launch: make Clean the whole site

Right now `/` is the chooser between the four looks, and Clean lives at
`/clean/`. For his domain, Clean has to be the site at `/`:

- move `pages/clean/*.html` up into `pages/` (replacing the chooser), and
  remove `pages/solid.html`, `premium.html`, `bold.html` (they stay in git history)
- in those pages: `{{root}}clean/<page>/` becomes `{{root}}<page>/` (keep
  `{{root}}clean/clean.css` and `clean.js`), `x-include file="clean/_header.html"`
  becomes `file="_header.html"` (same for the footer), and `path="clean/..."`
  in `x-head` drops the `clean/`
- delete the old built folders under `site/` (`solid`, `premium`, `bold`, and
  the page folders inside `site/clean/`) so they are not served
- update `scripts/test-clean.mjs` to the new paths, then rerun the delivery gate
  (remove `noindex` and the `Disallow: /` in `site/robots.txt` at the same time)

## Handover day, in this order

Do it with him, on his phone, so every account is his and he has logged in once.

1. **Domain** in his name, on his card, auto-renew on (Cloudflare Registrar or
   Namecheap). Recovery email and phone are his.
2. **GitHub account** for him. GitHub makes him set up two-step login: do it
   together with the GitHub Mobile app. Move this repo into his account
   (Settings > Transfer) or push it to a new repo there. Add yourself as a
   collaborator if he wants you to keep access.
3. **Netlify account** for him, signed up with GitHub. New project > import his
   repo. Build settings come from `netlify.toml`. Add his domain.
   (The demo at trudrive-looks-b37345.netlify.app is on your account, deployed
   by CLI. Leave it or delete it once his is live.)
   **Failed-deploy emails to you:** with his OK, Project configuration >
   Notifications > Emails > "Deploy failed" to david@travinyx.com, so if a
   build ever fails you hear about it, not him.
4. **Editor login.** On GitHub (his account): Settings > Developer settings >
   OAuth Apps > New OAuth App. Homepage URL: his site. Callback URL:
   `https://api.netlify.com/auth/done`. Copy the Client ID and make a client
   secret. On Netlify: Project configuration > Access & security > OAuth >
   Install provider > GitHub, paste both.
5. In `site/admin/config.yml` change `repo: CHANGE-ME/trudrive` to his
   `username/repo`, commit, wait for the deploy.
6. **He adds a real job himself** at `hissite.co.uk/admin` while you watch,
   following the guide, not you. Then add `/admin` to his phone's home screen
   and send him the PDF.
7. Google Business Profile: him as owner, you as manager.
8. Fill in the account sheet below and give him a copy. Passwords go in his
   phone's password manager, never on the sheet.

## Account sheet (for Gaz)

| What | Where | Logs in with | Renews | Costs |
|---|---|---|---|---|
| Your web address | | | | about £10 a year |
| Your site's files | github.com | | never | free |
| Hosting | netlify.com | GitHub | never | free |
| Email | | | | |
| Google reviews | business.google.com | | never | free |

**The one thing that can take your site down is the web address running out.**
Keep auto-renew on and keep the card on it up to date.

## Legal

The invoice or agreement says: on full payment, all rights in the site's
design, code and content pass to Gaz; Travinyx may show the site in its
portfolio.

## Developer notes

- `npm run build` locally, then the `trudrive` preview (port 4600). Set
  `SITE_URL` for a local build you mean to deploy; on Netlify, `URL` is used.
- Test the editor locally in Chrome or Edge: open `localhost:4600/admin/`,
  "Work with Local Repository", pick this folder. Saves write straight to
  `content/` and `site/uploads/`.
- `site/img/up/` is made at build time and is not committed.
- The editor is pinned to Sveltia 0.230.x in `site/admin/index.html`. To
  update, change the version, check `/admin` still loads and saves, then publish.
- The fixed photos elsewhere on the site still come from `scripts/images.py`.
