export async function scrapeFacebookProduct(url: string): Promise<boolean> {
  try {
    const appId = process.env.FB_APP_ID;
    const appSecret = process.env.FB_APP_SECRET;
    if (!appId || !appSecret) return false;

    const accessToken = `${appId}|${appSecret}`;
    const encodedUrl = encodeURIComponent(url);
    const endpoint = `https://graph.facebook.com/v19.0/?id=${encodedUrl}&scrape=true&access_token=${accessToken}`;

    const res = await fetch(endpoint, {
      method: "POST",
    });

    if (!res.ok) {
      console.error("[fb-scrape] failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[fb-scrape] error:", err);
    return false;
  }
}
