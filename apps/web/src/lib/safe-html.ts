import DOMPurify from "isomorphic-dompurify";

/** Rich text must never introduce script, event-handler or embedded-page code. */
export function safeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "iframe", "object", "embed"],
    FORBID_ATTR: ["style", "srcdoc"],
  });
}

/** JSON-LD is embedded inside a script raw-text element, not an HTML text node. */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
