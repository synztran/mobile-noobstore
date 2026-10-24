import { describe, expect, it } from "vitest";
import { safeHtml, safeJsonLd } from "./safe-html";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

describe("stored content boundaries", () => {
  it("loads sanitizer without CommonJS require(ESM) support", () => {
    const output = execFileSync(process.execPath, ["--no-experimental-require-module", "-e",
      'const p = require("isomorphic-dompurify"); process.stdout.write(p.sanitize("<p>OK</p><img src=x onerror=alert(1)>"));',
    ], { cwd: fileURLToPath(new URL("../../", import.meta.url)), encoding: "utf8" });
    expect(output).toContain("<p>OK</p>");
    expect(output).not.toContain("onerror");
  });
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
