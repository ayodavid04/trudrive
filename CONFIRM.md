# TruDrive: what we need from Gaz

Ask his partner, it'll be quickest. The first five are the ones from the first chat.

## Must have before anything goes live

1. **The towns he covers.** Nothing on the site names a town yet. It says North West.
2. **A business address.** UK law needs a real geographic address on the site. A registered office
   service is fine if he doesn't want his home address shown.
3. **Does he have a Google Business Profile?** If not, we set one up. That's where the reviews live.
4. **An email address and a domain,** if he has either. If not, what name he'd want (trudrive.co.uk?).
5. **His original photos and videos.** Everything on the demo is pulled from TikTok, which squashes
   them. His originals will be sharper and lighter. Before and after pairs from the same spot are gold.
6. **Is 07923 485811 on WhatsApp?** The quote button sends a WhatsApp message to that number.
7. **Budget, roughly.**

## Things written from his photos that he should check

The job descriptions were written from what is visible in his TikTok photos. He'll know better.

| On the site | Photo it came from | Check |
|---|---|---|
| Decking to porcelain: porcelain to the shed, black edging, chipping borders, composite fence panels | TikTok photo post, Jan 2026 (shed garden) | Did he fit the composite fence? |
| Pond garden: porcelain patio and path, dark border, artificial turf, raised block planter | Photo post, Aug 2026 | Was the planter wall his? It looks half built in the photo. |
| Concrete to porcelain: porcelain patio, artificial turf, horizontal slatted fencing | Photo post, Oct 2025 | Fence his? |
| Porcelain garden: patio, steps, stepping stones, raised beds in split-face cladding, new turf | Photo post, Jan 2026 (5 photos) | Cladding material right? |
| Front garden: grey porcelain, dark border course, back patio with patterned tile border | Photo post, Jul 2025 | Same property front and back? |
| Printed driveway: imprinted concrete, light border, curved artificial turf bed, drainage channel | Photo post, May 2026 | |
| Stone patio: natural stone in mixed sizes | Photo post, Aug 2025 | Indian sandstone, or porcelain that looks like it? |
| Block paved drive: grey block, charcoal border | Photo post, Oct 2025 (last photo) | |

## Things the copy says that are his to confirm

- "Over 15 years on the tools" (from his TikTok bio: 15+ years).
- "He comes out, measures up and gives you a price. Free, no obligation." Is that how he quotes?
- "Slabs on a proper base with the joints filled, so nothing comes through." Fair description of his method?
- "With drainage where the water sits." Does he do drainage?
- Materials list is from his flyer, plus imprinted concrete and artificial turf from his captions.

New on the Clean site (the fourth mockup), all written from his flyer and photos:

- "Old drive dug out and taken away." Does he clear and cart away?
- "Borders and edging to finish it off" and "drainage channels where the water sits."
- "Rotten decking and broken slabs cleared first."
- "A reliable, efficient working team" and "your satisfaction comes first" (both from his flyer).
- "Send a few photos and Gaz will tell you what the job needs. If it's worth a visit, he'll come out."
  Does he price from photos, or always visit?
- The four steps on About: photos, visit and price, pick a date, we lay it.
- "Photo quotes: send pictures, get a price back" on the home page.
- "22.8K people watched one of our porcelain patios on TikTok" (real, from his pinned video).
- The About page has a placeholder for a photo of Gaz, the team or the van, and a few lines in his
  own words.

## Before launch (Travinyx checklist)

- Swap TikTok photos for originals, rerun `python scripts/images.py`.
- Remove every yellow "For Gaz" note (`.demo-note`).
- Real Google review link on "Leave a review", reviews feed wired in once the profile exists.
- Privacy page, footer address, remove `noindex`, sitemap and robots, JSON-LD LocalBusiness with only
  facts the site states.
- Set `SITE_URL` for the build so share previews point at the real domain.

## His photos and videos (sent 14 Oct 2026)

Put in as he would in his editor. Captions were written from what the photos
show, so he should check them. The dates on the new ones only set the order on
Our work (newest first); he can change them.

| On the site | His file | Check |
|---|---|---|
| Video: "Before and after: overgrown garden" | The two videos sent at 20:56 (overgrown garden, then the composite fence garden), joined with a wipe and Before/After labels | Confirmed by David on 14 Oct: same garden. |
| Video: "Finished garden at dusk" | Evening video, lit fence | Did he put the lights in? The caption only says "lit up at dusk". |
| Video: "Porcelain path and new lawn", "Porcelain patio" | Two walkaround videos | |
| Photo: "Composite fencing" | Black fence, grey porcelain | Same job as the decking before and after (the shed garden)? It answers "did he fit the composite fence": looks like yes. |
| Photo: "Front path" | Terraced house, blue door | Top cut off: a political party sign on the street was in shot. |
| Photo: "Imprinted concrete driveway" | Already on the site | Top cut off: the customer was standing in the doorway, with a house sign. |
| Home and Services tiles | His block paved drive, sleeper patio, drainage path, composite fence, new build garden, bungalow front | |

Not used: his photos of the same shots already on the site where the TikTok copy
was bigger (the decking after, porcelain steps garden, imprinted drive, pergola
patio), close-ups that repeat a job, and the in-progress ones (tools and a turf
roll on the patio).

His WhatsApp videos came through at 480 to 576 px wide. Fine on a phone, soft
full screen on a laptop. The originals from his phone would be sharper; he can
add them himself in the editor later (under 25 MB each).

Captions on his new photos just say "lawn", so nobody needs to know which are real and which are artificial.
