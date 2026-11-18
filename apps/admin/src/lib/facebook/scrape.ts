/**
 * Ask Facebook to re-crawl a URL and refresh its cached link preview.
 *
 * Called after a product is created/edited. Two problems this guards against,
 * both observed on a real product:
 *
 * 1. RACE WITH THE WRITE. The Graph scrape was fired fire-and-forget
 *    (`void scrapeFacebookProduct(url)`) in the same request that inserted the
 *    row. Facebook's crawler can reach the storefront before the commit (or
 *    before the app's Redis/Data Cache warms) and cache the not-found page,
 *    which renders the site logo with no `og:url`. Facebook keeps that stale
 *    preview until someone hits "Scrape Again" in the debugger by hand.
 *
 * 2. WRONG APP ID / MISSING CREDENTIALS. Silently returning false made a
 *    failed scrape indistinguishable from a successful one.
 */

/** Graph API version. Keep in sync with the runbook. */
const GRAPH_VERSION = "v19.0";

/** UA that makes the storefront render the crawler-friendly full HTML. */
const SCRAPER_UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

/**
 * Wait for the storefront to serve a page that actually carries an `og:url`.
 *
 * We poll our own HTML rather than trusting timing: the storefront is the only
 * place that can tell us whether the product is visible yet. A 404 or a page
 * with no og:url means Facebook would cache a broken card.
 */
async function waitForOgUrl(
  url: string,
  attempts = 4,
  delayMs = 1500,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": SCRAPER_UA },
        cache: "no-store",
      });
      const html = await res.text();

      if (res.ok && /property="og:url"/.test(html)) {
        return true;
      }

      console.warn(
        `[fb-scrape] storefront not ready for ${url} (attempt ${i + 1}/${attempts}, status ${res.status})`,
      );
    } catch (err) {
      console.warn(`[fb-scrape] storefront probe failed:`, err);
    }

    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}

export async function scrapeFacebookProduct(url: string): Promise<boolean> {
  try {
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    if (!appId || !appSecret) {
      console.warn("[fb-scrape] FB_APP_ID / FB_APP_SECRET unset — skipping");
      return false;
    }

    // Don't hand Facebook a page that would produce a broken preview.
    const ready = await waitForOgUrl(url);
    if (!ready) {
      console.warn(
        `[fb-scrape] ${url} served no og:url after retries — skipping scrape so Facebook does not cache a broken card`,
      );
      return false;
    }

    const accessToken = `${appId}|${appSecret}`;
    const encodedUrl = encodeURIComponent(url);
    const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/?id=${encodedUrl}&scrape=true&access_token=${accessToken}`;

    const res = await fetch(endpoint, { method: "POST" });

    if (!res.ok) {
      console.error("[fb-scrape] failed:", res.status, await res.text());
      return false;
    }

    console.log(`[fb-scrape] refreshed preview for ${url}`);
    return true;
  } catch (err) {
    console.error("[fb-scrape] error:", err);
    return false;
  }
}