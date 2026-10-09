import type { Metadata } from "next";

/**
 * Single builder for Open Graph / Twitter card metadata.
 *
 * Every page that returns its own `openGraph` object REPLACES the root
 * layout's object field-by-field rather than merging into it (Next merges at
 * the top level of `metadata`, not inside `openGraph`). So a page that
 * declares `openGraph: { title }` silently loses `url` and `images` — which is
 * exactly how /shop ended up emitting neither, and how a not-found product
 * page fell back to the site logo with no `og:url` at all (the "Thiếu tài sản
 * og:url" Facebook reports).
 *
 * Route every page through `buildOg` so `url` is always present.
 *
 * Canonical origin. `metadataBase` in app/layout.tsx is the authority; this
 * mirrors it because `buildOg` needs to absolutize a path on its own (e.g. for
 * `alternates.canonical`) without depending on metadata resolution order.
 */
export const SITE_URL = "https://www.noobstore.xyz";

export const SITE_NAME = "NoobStore";

export const SITE_DESCRIPTION =
  "Service and Retail for Premium Mechanical Keyboards";

/** Fallback preview image. Must exist in /public. */
export const DEFAULT_OG_IMAGE = "/icon-512.png";

export const SITE_LOCALE = "vi_VN";

export interface BuildOgInput {
  /** Page title, without the "%s - NoobStore" template. */
  title: string;
  description?: string | null;
  /**
   * Absolute URL, or a site-relative path (resolved against SITE_URL). The
   * canonical address of THIS page — required, because a missing og:url is a
   * hard Facebook error.
   */
  url: string;
  /**
   * Absolute or site-relative image URL. Product images are stored absolute by
   * the admin uploader; relative values are resolved against SITE_URL.
   */
  image?: string | null;
  /** Alt text. Falls back to `title` — never emit an image with no alt. */
  imageAlt?: string | null;
  /**
   * Only pass these when the real pixel dimensions are known. Declaring a
   * wrong ratio makes Facebook crop to the lie (Messenger renders a broken
   * preview), so the default is to omit them and let Facebook read the bytes.
   */
  imageWidth?: number;
  imageHeight?: number;
  type?: "website" | "article";
}

function absolutize(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

/**
 * Build a `Metadata` object with a complete, self-consistent OG + Twitter
 * pair. Both always carry a url and an image, so a page can never emit a
 * half-populated card.
 */
export function buildOg(input: BuildOgInput): Metadata {
  const {
    title,
    description,
    url,
    image,
    imageAlt,
    imageWidth,
    imageHeight,
    type = "website",
  } = input;

  const canonical = absolutize(url);
  const imageUrl = absolutize(image || DEFAULT_OG_IMAGE);
  const alt = imageAlt || title;
  const desc = description?.trim() || `${title} - ${SITE_NAME}`;

  // Only declare dimensions we actually know. `width`/`height` are optional in
  // the OG spec, and an incorrect value is worse than an absent one.
  const imageEntry =
    imageWidth && imageHeight
      ? { url: imageUrl, alt, width: imageWidth, height: imageHeight }
      : { url: imageUrl, alt };

  return {
    title,
    description: desc,
    alternates: { canonical },
    openGraph: {
      type,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      title,
      description: desc,
      url: canonical,
      images: [imageEntry],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [imageUrl],
    },
  };
}

/**
 * Strip HTML tags and clamp to a length social platforms will render.
 * Product/blog descriptions are stored as HTML.
 */
export function toPlainText(html: string | null | undefined, max = 160): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Pick the best preview image from a product's image set.
 *
 * `thumbnail` is whatever the uploader stored first, which is frequently a
 * portrait phone photo. On the product that prompted this, `thumbnail` was
 * 900x1200 (0.75) while `images[0]` was 1440x1440 — square crops cleanly,
 * portrait does not. Across sampled products the gallery images run 1.50–1.78
 * (landscape), so gallery-first lands on the better shot either way.
 *
 * We prefer the first gallery image and only fall back to the thumbnail.
 *
 * Note we cannot verify actual pixel dimensions server-side without fetching
 * the bytes — the products table stores no width/height and Supabase Storage
 * exposes none — which is why we never declare dimensions. See BuildOgInput.
 */
export function pickProductOgImage(
  thumbnail: string | null | undefined,
  images: string[] | null | undefined,
): string | null {
  const first = images?.find((img) => typeof img === "string" && img.trim());
  return first || thumbnail || null;
}