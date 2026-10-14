// Fetches his Google rating and latest reviews for the site, at build time.
//
// Needs two settings in Cloudflare Pages (Settings > Variables), set at
// handover once his Business Profile is verified:
//   GOOGLE_PLACE_ID      his business's place ID (Google's Place ID Finder)
//   GOOGLE_PLACES_KEY    an API key from his own Google Cloud project, limited
//                        to the Places API (New)
// Without them, or if Google does not answer, nothing changes: the site shows
// the reviews he copied in himself. A daily rebuild
// (.github/workflows/refresh-reviews.yml) keeps it current.
//
// Google sends at most five reviews, the ones it ranks most relevant. About
// 30 calls a month, well inside the free monthly allowance.
import fs from 'node:fs';

const OUT = 'site/img/up/google.json';

export async function fetchGoogleReviews({ warn }) {
  const id = process.env.GOOGLE_PLACE_ID, key = process.env.GOOGLE_PLACES_KEY;
  fs.rmSync(OUT, { force: true });
  if (!id || !key) return null;
  try {
    const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri' },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`Google answered ${r.status}`);
    const p = await r.json();
    const data = {
      rating: p.rating || 0,
      count: p.userRatingCount || 0,
      mapsUrl: p.googleMapsUri || '',
      reviews: (p.reviews || []).filter((v) => (v.originalText || v.text)?.text).map((v) => ({
        name: v.authorAttribution?.displayName || 'A Google user',
        stars: v.rating || 5,
        text: (v.originalText || v.text).text,
        date: (v.publishTime || '').slice(0, 10),
      })),
    };
    fs.writeFileSync(OUT, JSON.stringify(data, null, 1));
    return data;
  } catch (e) {
    warn(`could not get the Google reviews (${e.message}), so the site shows the ones copied in by hand`);
    return null;
  }
}
