/**
 * Rewrites `<img>` tags inside product description HTML so they don't cause
 * layout shift / unsized-image warnings:
 *  - `loading="lazy"`  → deferred loading, images no longer shift the layout
 *    during the initial paint window
 *  - `decoding="async"` → renderer isn't blocked while images decode
 *  - `max-width:100%;height:auto` → never overflow the container
 */
export function optimizeDescriptionHtml(
  html: string | null | undefined
): string | null {
  if (!html) return null;

  return html.replace(/<img\b([^>]*?)\/?>/gi, (_match, attrs: string) => {
    if (/\bloading\s*=/.test(attrs)) return `<img${attrs}>`;

    let a = attrs.replace(/\s*\/\s*$/, "");
    const style = a.match(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const clamp = "max-width:100%;height:auto;";
    if (style) {
      const existing = style[1] ?? style[2];
      a = a.replace(
        style[0],
        `style="${(existing + ";" + clamp).replace(/;+/g, ";")}"`
      );
    } else {
      a += ` style="${clamp}"`;
    }

    return `<img${a} loading="lazy" decoding="async">`;
  });
}
