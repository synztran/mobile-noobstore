import { describe, expect, it } from "vitest";
import { safeHtml, safeJsonLd } from "./safe-html";

describe("stored content boundaries", () => {
  it("keeps text but removes script, events, embeds and forms", () => {
    const clean = safeHtml('<p>Details</p><img src=x onerror="alert(1)"><script>alert(1)</script><iframe src="https://evil.invalid"></iframe><form><input></form>');
    expect(clean).toContain("<p>Details</p>");
    expect(clean).not.toMatch(/onerror|script|iframe|form|input/);
  });
  it("prevents JSON-LD script termination without changing data", () => {
    const data = { name: '</script><script>alert(1)</script>' };
    const encoded = safeJsonLd(data);
    expect(encoded).not.toContain("<");
    expect(JSON.parse(encoded)).toEqual(data);
  });
});
