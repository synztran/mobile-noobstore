import { describe, expect, it } from "vitest";

import {
  APEX_DOMAIN,
  classifyDevice,
  isManagedHost,
  resolveDeviceRouting,
  targetHostFor,
} from "./device";

// ─── classifyDevice ──────────────────────────────────────────────────────────

describe("classifyDevice", () => {
  const PHONE_UAS = [
    // iPhone Safari
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    // Android phone Chrome
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    // Samsung Internet
    "Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36",
    // Windows Phone
    "Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950)",
  ];

  const TABLET_UAS = [
    // iPad Safari
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    // Android tablet (no "Mobile" token)
    "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    // iPad asking for desktop site (strips Mobile/iPhone tokens)
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  ];

  const DESKTOP_UAS = [
    // macOS Chrome
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    // Windows Firefox
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
  ];

  it.each(PHONE_UAS)("classifies phone UA as mobile: %s", (ua) => {
    expect(classifyDevice(ua)).toBe("mobile");
  });

  it.each(TABLET_UAS)("classifies tablet UA as desktop: %s", (ua) => {
    expect(classifyDevice(ua)).toBe("desktop");
  });

  it.each(DESKTOP_UAS)("classifies desktop UA as desktop: %s", (ua) => {
    expect(classifyDevice(ua)).toBe("desktop");
  });

  it("defaults to desktop when the UA is missing (bots, curl)", () => {
    expect(classifyDevice(null)).toBe("desktop");
    expect(classifyDevice(undefined)).toBe("desktop");
    expect(classifyDevice("")).toBe("desktop");
  });
});

// ─── isManagedHost ───────────────────────────────────────────────────────────

describe("isManagedHost", () => {
  it("manages exactly the production host trio", () => {
    expect(isManagedHost("www.noobstore.xyz")).toBe(true);
    expect(isManagedHost("m.noobstore.xyz")).toBe(true);
    expect(isManagedHost("noobstore.xyz")).toBe(true);
  });

  it("never manages local/preview hosts", () => {
    expect(isManagedHost("localhost")).toBe(false);
    expect(isManagedHost("localhost:3002")).toBe(false);
    expect(isManagedHost("mobile-noobstore.vercel.app")).toBe(false);
    expect(isManagedHost("192.168.1.10")).toBe(false);
    expect(isManagedHost("gacha.noobstore.xyz")).toBe(false);
  });
});

// ─── resolveDeviceRouting ────────────────────────────────────────────────────

describe("resolveDeviceRouting", () => {
  const PHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148 Safari/604.1";
  const DESKTOP_UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36";

  it("serves a phone already on the m. host", () => {
    const r = resolveDeviceRouting({
      hostname: "m.noobstore.xyz",
      userAgent: PHONE_UA,
      overrideCookie: undefined,
    });
    expect(r.action).toEqual({ kind: "serve", deviceClass: "mobile" });
    expect(r.overrideApplied).toBe(false);
  });

  it("redirects a phone on www to m., preserving device class", () => {
    const r = resolveDeviceRouting({
      hostname: "www.noobstore.xyz",
      userAgent: PHONE_UA,
      overrideCookie: undefined,
      mobileSubdomainEnabled: true,
    });
    expect(r.action).toEqual({
      kind: "redirect",
      deviceClass: "mobile",
      targetHost: `m.${APEX_DOMAIN}`,
    });
  });

  it("redirects a desktop browser on m. to www.", () => {
    const r = resolveDeviceRouting({
      hostname: "m.noobstore.xyz",
      userAgent: DESKTOP_UA,
      overrideCookie: undefined,
      mobileSubdomainEnabled: true,
    });
    expect(r.action).toEqual({
      kind: "redirect",
      deviceClass: "desktop",
      targetHost: "www.noobstore.xyz",
    });
  });

  it("serves a desktop browser on www without redirect", () => {
    const r = resolveDeviceRouting({
      hostname: "www.noobstore.xyz",
      userAgent: DESKTOP_UA,
      overrideCookie: undefined,
    });
    expect(r.action).toEqual({ kind: "serve", deviceClass: "desktop" });
  });

  it("normalizes the apex host to www for desktop visitors", () => {
    const r = resolveDeviceRouting({
      hostname: "noobstore.xyz",
      userAgent: DESKTOP_UA,
      overrideCookie: undefined,
      mobileSubdomainEnabled: true,
    });
    expect(r.action).toEqual({
      kind: "redirect",
      deviceClass: "desktop",
      targetHost: "www.noobstore.xyz",
    });
  });

  it("sticky override wins over UA — forces a desktop phone onto www", () => {
    // UA says mobile (would serve on m.), override says desktop → redirect.
    const r = resolveDeviceRouting({
      hostname: "m.noobstore.xyz",
      userAgent: PHONE_UA,
      overrideCookie: "desktop",
      mobileSubdomainEnabled: true,
    });
    expect(r.action).toEqual({
      kind: "redirect",
      deviceClass: "desktop",
      targetHost: "www.noobstore.xyz",
    });
    expect(r.overrideApplied).toBe(true);
  });

  it("override that agrees with the current host serves without redirect", () => {
    const r = resolveDeviceRouting({
      hostname: "www.noobstore.xyz",
      userAgent: PHONE_UA,
      overrideCookie: "desktop",
    });
    expect(r.action).toEqual({ kind: "serve", deviceClass: "desktop" });
    expect(r.overrideApplied).toBe(true);
  });

  it("override to mobile moves a desktop browser to m.", () => {
    const r = resolveDeviceRouting({
      hostname: "www.noobstore.xyz",
      userAgent: DESKTOP_UA,
      overrideCookie: "mobile",
      mobileSubdomainEnabled: true,
    });
    expect(r.action).toEqual({
      kind: "redirect",
      deviceClass: "mobile",
      targetHost: `m.${APEX_DOMAIN}`,
    });
    expect(r.overrideApplied).toBe(true);
  });

  it("ignores unknown override values", () => {
    const r = resolveDeviceRouting({
      hostname: "www.noobstore.xyz",
      userAgent: PHONE_UA,
      overrideCookie: "free-text-garbage",
      mobileSubdomainEnabled: true,
    });
    expect(r.action.kind).toBe("redirect");
    expect(r.overrideApplied).toBe(false);
  });

  it("never redirects unmanaged hosts regardless of classification", () => {
    for (const host of ["localhost", "mobile-noobstore.vercel.app", "gacha.noobstore.xyz"]) {
      const r = resolveDeviceRouting({
        hostname: host,
        userAgent: PHONE_UA,
        overrideCookie: undefined,
      });
      expect(r.action).toEqual({ kind: "serve", deviceClass: "mobile" });
    }
  });

  it("treats hostname case-insensitively", () => {
    const r = resolveDeviceRouting({
      hostname: "WWW.NOOBSTORE.XYZ",
      userAgent: DESKTOP_UA,
      overrideCookie: undefined,
    });
    expect(r.action).toEqual({ kind: "serve", deviceClass: "desktop" });
  });
});

// ─── disabled routing (m. subdomain not live yet) ───────────────────────────

describe("resolveDeviceRouting — mobileSubdomainEnabled=false", () => {
  const PHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148 Safari/604.1";
  const DESKTOP_UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36";

  it("never redirects a phone on a managed host", () => {
    for (const host of ["www.noobstore.xyz", "noobstore.xyz", "m.noobstore.xyz"]) {
      const r = resolveDeviceRouting({
        hostname: host,
        userAgent: PHONE_UA,
        overrideCookie: undefined,
      });
      expect(r.action).toEqual({ kind: "serve", deviceClass: "mobile" });
    }
  });

  it("never redirects a desktop browser on a managed host", () => {
    for (const host of ["www.noobstore.xyz", "noobstore.xyz", "m.noobstore.xyz"]) {
      const r = resolveDeviceRouting({
        hostname: host,
        userAgent: DESKTOP_UA,
        overrideCookie: undefined,
      });
      expect(r.action).toEqual({ kind: "serve", deviceClass: "desktop" });
    }
  });

  it("still honors the override cookie for classification but never redirects", () => {
    const r = resolveDeviceRouting({
      hostname: "www.noobstore.xyz",
      userAgent: PHONE_UA,
      overrideCookie: "desktop",
    });
    expect(r.action).toEqual({ kind: "serve", deviceClass: "desktop" });
    expect(r.overrideApplied).toBe(true);
  });
});

// ─── targetHostFor ───────────────────────────────────────────────────────────

describe("targetHostFor", () => {
  it("maps mobile → m. and desktop → www.", () => {
    expect(targetHostFor("mobile")).toBe("m.noobstore.xyz");
    expect(targetHostFor("desktop")).toBe("www.noobstore.xyz");
  });
});
