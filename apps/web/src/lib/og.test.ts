import { describe, it, expect } from "vitest";
import {
  buildOg,
  pickProductOgImage,
  toPlainText,
  DEFAULT_OG_IMAGE,
  SITE_URL,
} from "./og";

describe("buildOg", () => {
  it("always emits an og:url, including the not-found style fallback", () => {
    // The regression that started all this: a generateMetadata branch returning
    // only `{ title }` dropped openGraph, so Facebook saw no og:url and used
    // the site logo.
    const md = buildOg({
      title: "Sản phẩm",
      description: "Sản phẩm không tìm thấy trên NoobStore.",
      url: "/shop/gmk-stargaze",
    });

    expect(md.openGraph?.url).toBe(`${SITE_URL}/shop/gmk-stargaze`);
    expect(md.openGraph?.images).toHaveLength(1);
  });

  it("falls back to the site logo when no image is given", () => {
    const md = buildOg({ title: "Sản phẩm", url: "/shop/x" });
    const images = md.openGraph?.images as Array<{ url: string }>;

    expect(images[0].url).toBe(`${SITE_URL}${DEFAULT_OG_IMAGE}`);
  });

  it("keeps an absolute product image untouched", () => {
    const abs = "https://cdn.example.com/storage/v1/Products/a.jpg";
    const md = buildOg({ title: "GMK", url: "/shop/a", image: abs });

    expect((md.openGraph?.images as Array<{ url: string }>)[0].url).toBe(abs);
  });

  it("absolutizes a site-relative image path", () => {
    const md = buildOg({ title: "GMK", url: "/shop/a", image: "/icon-512.png" });
    expect((md.openGraph?.images as Array<{ url: string }>)[0].url).toBe(
      `${SITE_URL}/icon-512.png`,
    );
  });

  it("omits image dimensions unless both are known", () => {
    // Declaring a wrong ratio is worse than declaring none: Facebook crops to
    // the declared ratio and Messenger honours it strictly.
    const unknown = buildOg({ title: "GMK", url: "/shop/a", image: "/a.jpg" });
    expect((unknown.openGraph?.images as Array<Record<string, unknown>>)[0])
      .not.toHaveProperty("width");
    expect((unknown.openGraph?.images as Array<Record<string, unknown>>)[0])
      .not.toHaveProperty("height");

    const known = buildOg({
      title: "GMK",
      url: "/shop/a",
      image: "/a.jpg",
      imageWidth: 1200,
      imageHeight: 630,
    });
    const entry = (known.openGraph?.images as Array<
      Record<string, unknown>
    >)[0];
    expect(entry.width).toBe(1200);
    expect(entry.height).toBe(630);
  });

  it("never emits an image with empty alt text", () => {
    const md = buildOg({ title: "GMK Stargaze", url: "/shop/a", image: "/a.jpg" });
    expect((md.openGraph?.images as Array<{ alt: string }>)[0].alt).toBe(
      "GMK Stargaze",
    );
  });

  it("sets canonical and mirrors og:url onto it", () => {
    const md = buildOg({ title: "GMK", url: "/shop/a" });
    expect(md.alternates?.canonical).toBe(`${SITE_URL}/shop/a`);
    expect(md.openGraph?.url).toBe(md.alternates?.canonical);
  });

  it("always gives twitter a summary_large_image card with an image", () => {
    const md = buildOg({ title: "GMK", url: "/shop/a" });
    // Next's exported Twitter type omits `card`, so read it off the object.
    const twitter = md.twitter as Record<string, unknown>;
    expect(twitter.card).toBe("summary_large_image");
    expect(md.twitter?.images).toHaveLength(1);
  });

  it("falls back to a generated description when none is supplied", () => {
    const md = buildOg({ title: "GMK", url: "/shop/a" });
    expect(md.description).toBe("GMK - NoobStore");
    expect(md.openGraph?.description).toBe("GMK - NoobStore");
  });
});

describe("toPlainText", () => {
  it("strips tags and collapses whitespace", () => {
    expect(toPlainText("<p>Hello <b>GMK</b></p>\n\n<p>World</p>")).toBe(
      "Hello GMK World",
    );
  });

  it("decodes the entities that survive tag stripping", () => {
    expect(toPlainText("A &amp; B &lt;ok&gt; &quot;quoted&quot;")).toBe(
      'A & B <ok> "quoted"',
    );
  });

  it("clamps to the requested length", () => {
    expect(toPlainText("x".repeat(500), 10)).toHaveLength(10);
  });

  it("returns empty string for null/undefined/empty", () => {
    expect(toPlainText(null)).toBe("");
    expect(toPlainText(undefined)).toBe("");
    expect(toPlainText("")).toBe("");
  });
});

describe("pickProductOgImage", () => {
  it("prefers the first gallery image over a portrait thumbnail", () => {
    // The reported product: thumbnail was 900x1200 portrait, gallery[0] was a
    // landscape shot that crops correctly.
    expect(
      pickProductOgImage(
        "https://cdn/portrait.jpg",
        ["https://cdn/landscape.jpg", "https://cdn/other.jpg"],
      ),
    ).toBe("https://cdn/landscape.jpg");
  });

  it("skips empty and non-string gallery entries", () => {
    expect(
      pickProductOgImage("https://cdn/thumb.jpg", ["", "   ", null as never]),
    ).toBe("https://cdn/thumb.jpg");
  });

  it("falls back to the thumbnail when the gallery is empty", () => {
    expect(pickProductOgImage("https://cdn/thumb.jpg", [])).toBe(
      "https://cdn/thumb.jpg",
    );
    expect(pickProductOgImage("https://cdn/thumb.jpg", null)).toBe(
      "https://cdn/thumb.jpg",
    );
  });

  it("returns null when the product has no images at all", () => {
    expect(pickProductOgImage(null, null)).toBeNull();
    expect(pickProductOgImage(undefined, undefined)).toBeNull();
  });
});