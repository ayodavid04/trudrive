# TruDrive: getting found on Google, Maps, Bing and AI

What the site does now (16 Oct 2026), then every step left, in order. The site is
done; what's left is mostly clicking and a few answers from Gaz.

## What "patios wigan" actually shows

Checked on Google UK, 16 Oct 2026:

- **Ads** at the top.
- **The map pack** (three businesses on a map). This comes only from Google
  Business Profiles. Wigan's top three: C.G Paving (5.0, 114 reviews),
  Jack's Driveways (4.8, 30), AS Paving (5.0, 19). All four listed there use the
  category **Paving contractor**. AS Paving is in with only 19 reviews.
- **Directories:** Checkatrade, TrustATrader, Yell, Bark, Bookabuilder.
- **Rivals' own town pages,** like jldriveways.co.uk/patios-wigan and
  dalysdriveways.co.uk/areas/wigan/patio, plus one Facebook page.
- People also search "patios wigan prices" and "patios wigan cost".

Searching **"trudrive"** on Google UK: Gaz's Facebook page ("Trudrive | Wigan")
is already first. trudrive.com is a US marketing agency, and Tru & Drive Ltd is a
Stockport car dealer. Neither does driveways, so once his site is indexed and his
Google profile is live, his name searches are his.

## What the site now has

- Open to Google, Bing and AI search tools (it was blocked until today).
- "Wigan" in every title, "Based in Wigan" in the footer.
- Patios and Driveways pages with his photos, a materials guide and FAQs.
- A page for 17 towns near Wigan (Standish, Orrell, Hindley, Ashton, Leigh,
  Atherton, Tyldesley, Golborne, Skelmersdale, Ormskirk, St Helens,
  Newton-le-Willows, Chorley, Westhoughton, Horwich, Bolton, Warrington), each with
  that council's dropped kerb process, who handles planning, and postcodes.
- A page for every before and after. Add a job in the editor with a town and it
  gets its own page and shows on that town's page.
- Data for Google and AI: business details, site name, services, FAQs,
  breadcrumbs, photos and videos in the sitemap, llms.txt, Facebook and TikTok
  linked as his.

## Every step left, in order

**Done 17 Oct 2026:** steps 1 to 10. www.trudrive.co.uk redirects to trudrive.co.uk
(A record 192.0.2.1 proxied, plus the "Redirect from WWW to root" rule), Always Use
HTTPS is on, Crawler Hints is on, no AI crawler is blocked (all 32 allowed), Search
Console is verified (domain property), the sitemap reads "Success, 35 pages, 8 videos",
and indexing was requested for the home page, /patios/, /driveways/, /areas/,
/porcelain-patios/, /block-paving/, /imprinted-concrete/, /fencing/ and
/artificial-grass/. Bing has all 35 pages through IndexNow (`node scripts/indexnow.mjs`
after any change), so steps 11 and 12 are optional now.

**Cloudflare (David, 10 minutes)**

1. Open dash.cloudflare.com and click **trudrive.co.uk**.
2. **www:** go to DNS, then Records, then Add record. Type `CNAME`, Name `www`,
   Target `trudrive.co.uk`, Proxy status on (orange cloud). Save.
3. Go to Rules, then Templates (or type "WWW to root" in the search box at the
   top), pick **Redirect from WWW to root**, and Deploy. Check: typing
   www.trudrive.co.uk now lands on trudrive.co.uk.
4. **HTTPS:** type "Always Use HTTPS" in the search box at the top, open it and
   switch it on. Right now http://trudrive.co.uk loads without moving to https.
5. **Bing pings:** type "Crawler Hints" in the search box and switch it on. It tells
   Bing straight away whenever a page changes.
6. **AI tools:** type "AI Crawl Control" (or "Bots") in the search box. Make sure
   nothing blocks AI crawlers and that "managed robots.txt" is off. ChatGPT,
   Perplexity and Copilot can only recommend him if they can read the site.

**Google Search Console (David, 10 minutes)**

7. Go to search.google.com/search-console, click Add property, choose **Domain**,
   type `trudrive.co.uk` and Continue.
8. It will offer to verify through Cloudflare: click Start verification and log in
   to Cloudflare. If it doesn't, copy the TXT record it shows, add it in Cloudflare
   (DNS, Add record, Type TXT, Name `@`, paste it), go back and click Verify.
9. Left menu, **Sitemaps**: type `sitemap.xml` and Submit.
10. Top bar, **URL inspection**: paste https://trudrive.co.uk/ and click Request
    indexing. Do the same for /patios/, /driveways/ and /areas/.

**Bing Webmaster Tools (David, 5 minutes). Bing feeds ChatGPT search and Copilot.**

11. Go to bing.com/webmasters, sign in, and choose **Import from Google Search
    Console**. Pick trudrive.co.uk and import. That brings the sitemap with it.
12. Open URL Submission and submit the home page, /patios/, /driveways/ and /areas/.

**Google Business Profile, the map pack (with Gaz, in person, on his phone)**

13. On Gaz's phone, open business.google.com signed in to the profile's Google
    account. Do it with him. Don't take his password.
14. Name, exactly: **TruDrive Driveways & Patios**. Nothing added, no "Wigan" in the
    name. Google suspends profiles that stuff keywords into the name.
15. Main category: **Paving contractor**. Extra categories, only ones he really
    does: Landscaper, Fence contractor, Concrete contractor, Bricklayer.
16. When it asks about a location customers can visit, say **No**, because he goes
    to them. It still needs his business address to verify, but hides it.
17. Service areas: Wigan, Standish, Orrell, Hindley, Ashton-in-Makerfield, Leigh,
    Atherton, Tyldesley, Golborne, Skelmersdale, Ormskirk, St Helens,
    Newton-le-Willows, Chorley, Westhoughton, Horwich, Bolton, Warrington.
18. Phone `07923 485811`. Website `https://trudrive.co.uk`.
19. Verify. Google will usually ask for one continuous video on his phone and say
    what to film (normally the street outside, his van or tools, and something
    only the owner can do). Follow its list.
20. Once it's live: real hours he takes calls; services (block paving, imprinted
    concrete, tarmac, gravel, porcelain patios, Indian sandstone patios, fencing,
    turfing, artificial grass, garden walls); 20 or more job photos; logo.
21. Description (paste this, it's under Google's 750 characters):

    > TruDrive Driveways & Patios is Gaz and his team, laying driveways and patios
    > across Wigan and the North West for over 15 years. Driveways in block paving,
    > imprinted concrete, tarmac and gravel. Patios in porcelain, Indian sandstone
    > and crazy paving. We also do paths and steps, fencing, turfing and artificial
    > grass, and garden walls. The old drive or patio is dug out and taken away, and
    > the new one is laid on a solid base with edging and drainage to finish it.
    > Quotes are free with no obligation: send a few photos on WhatsApp and Gaz will
    > come back to you with a price.

22. In the profile, tap **Ask for reviews** and copy the link. In Google Maps, open
    the profile, tap Share and copy that link. Paste both into the website editor
    (Business details, Google reviews links). The review QR code and
    trudrive.co.uk/review then go straight to his review form.

**Reviews (Gaz, starting the day the profile is live). This decides the map pack.**

23. Send trudrive.co.uk/review on WhatsApp to every customer from the last two
    years. Aim for 20 in the first two months: AS Paving is in Wigan's top three
    with 19.
24. Say it helps if they mention what was done and where, like "new porcelain
    patio in Standish". Never offer anything for a review, and never write one.
25. Reply to every review, and hand the QR card over at the end of every job.

**Facebook (Gaz, 5 minutes). It's already his top result for "trudrive".**

26. Rename the page from "Trudrive" to **TruDrive Driveways & Patios** (page
    settings, Page info, Name).
27. Add the website `https://trudrive.co.uk` to the page's contact info.
28. Make the address, phone and email on Facebook exactly match the website and
    the Google profile.

**Bing Places and Apple (after the Google profile is verified)**

29. Go to bingplaces.com, sign in, and choose **Import from Google Business
    Profile**. Copilot and ChatGPT use Bing's business listings.
30. Go to businessconnect.apple.com and add the business (Siri and Apple Maps). If
    it insists on a shopfront customers can visit, skip it.

**Directories (Gaz or David, an hour). Same name, phone, address, website and
description on every one.**

31. Yell.com free listing. It's on page one for "patios wigan".
32. Bark.com (free to list, you pay per lead). Also on page one.
33. MyBuilder (free to join, pay per lead).
34. Free listings: FreeIndex, Thomson Local, Cylex, Hotfrog, Brownbook,
    192.com business, Nextdoor business page, and Wiganworld classifieds (it shows
    up for "patios wigan").
35. Paid, his call once he has reviews to show: Checkatrade and TrustATrader. Both
    are on page one for "patios wigan".

**What keeps it climbing (Gaz, ongoing)**

36. Every job goes in the editor with a before, an after and the **Town** field.
    It gets its own page and appears on that town's page.
37. Post the same job on TikTok and Facebook with the town in the caption, like
    "Porcelain patio in Standish".
38. Start a YouTube channel called TruDrive Driveways & Patios, link the website,
    and post the TikToks as Shorts with the town in the title. Google shows YouTube
    in video results and quotes it in AI answers.
39. TikTok bio: "Driveways & patios | Wigan & the North West | 07923 485811", with
    the website link if TikTok lets his account add one.

**Answers needed from Gaz (one message)**

40. The postcode for 19 Ridyard Street. The address is on the site already, but
    only on the Privacy page, because the law needs it somewhere. Everywhere else
    just says "Based in Wigan". Type the postcode in the editor (Business details).
41. A few lines about himself for the About page, and the hours he takes calls.

Decided 17 Oct: email is trudrive.landscaping@outlook.com; no prices on the site;
jobs are not tied to towns (the town pages are for search); he covers the whole
North West, and Cumbria is part of it, so it stays.

**Check it's working (two weeks after step 10)**

42. Search Console, Performance: look for "patios wigan", "driveways wigan" and
    "trudrive" in Queries, and which pages they land on.
43. The Google profile's Performance tab: calls, website clicks and searches.

## What to expect

- **"trudrive" searches:** the site should show within a week or two of
  indexing, and his profile panel once it's verified.
- **The map pack for "patios wigan":** needs the verified profile and about 20
  reviews. Realistically one to three months.
- **Page one in the blue links for "patios wigan":** the directories (steps 31 to
  35) get him there soonest. His own pages climb over a few months as Google
  trusts the new domain, and faster with reviews and listings pointing at it.
- **ChatGPT, Gemini, Copilot and Perplexity:** they pick local trades from Google
  and Bing listings, review counts and directories, so this follows steps 13 to 35.
