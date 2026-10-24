import DOMPurify from "isomorphic-dompurify";

/** Rich text must never introduce script, event-handler or embedded-page code. */
export function safeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "iframe", "object", "embed"],
    FORBID_ATTR: ["style", "srcdoc"],
  });
}

// Preserve existing callers without changing shop page/component files.
export { safeJsonLd } from "./safe-json-ld";
