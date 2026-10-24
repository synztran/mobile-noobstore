/** JSON-LD is embedded inside a script raw-text element, not an HTML text node. */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
