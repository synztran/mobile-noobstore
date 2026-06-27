import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "b", "i", "u", "strong", "em", "s", "sub", "sup",
  "ul", "ol", "li",
  "a", "img",
  "blockquote", "pre", "code",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "hr", "span", "div",
  "table", "thead", "tbody", "tr", "th", "td",
];

const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel", "class"];

DOMPurify.addHook("uponSanitizeElement", (node, data) => {
  if (data.tagName === "script" || data.tagName === "style") {
    node.parentNode?.removeChild(node);
  }
});

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
  });
}
