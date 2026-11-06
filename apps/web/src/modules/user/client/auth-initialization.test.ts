import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const authProvider = readFileSync(
  fileURLToPath(new URL("./AuthProvider.tsx", import.meta.url)),
  "utf8"
);

describe("AuthProvider session initialization", () => {
  it("uses Supabase INITIAL_SESSION instead of a parallel startup getSession", () => {
    const initializationEffect = authProvider.slice(
      authProvider.indexOf("// Supabase emits INITIAL_SESSION"),
      authProvider.indexOf("// Auth methods")
    );
    expect(initializationEffect).toContain('event === "INITIAL_SESSION"');
    expect(initializationEffect).not.toContain("supabase.auth.getSession()");
  });

  it("keeps login-only mission work outside the synchronous auth listener", () => {
    const listener = authProvider.slice(
      authProvider.indexOf("supabase.auth.onAuthStateChange"),
      authProvider.indexOf(
        "return () => {",
        authProvider.indexOf("supabase.auth.onAuthStateChange")
      )
    );
    expect(listener).toContain("queueMicrotask");
    expect(listener).not.toContain("async (event");
  });

  it("does not issue getSession while mounting AuthProvider", () => {
    const listener = authProvider.slice(
      authProvider.indexOf("// Supabase emits INITIAL_SESSION"),
      authProvider.indexOf("// Auth methods")
    );
    expect(listener).not.toContain("supabase.auth.getSession()");
    expect(listener).toContain("onAuthStateChange");
  });
});
