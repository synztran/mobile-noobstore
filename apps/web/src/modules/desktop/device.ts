import type {
  DeviceClass,
  DeviceResolution,
  DeviceRoutingAction,
} from "./types";

/**
 * Pure device-classification + domain-routing logic for the desktop module.
 *
 * Zero Next.js / Node imports — runs identically in the Edge middleware, in
 * Vitest, and (if ever needed) on the client. This is the ONLY place that
 * decides which host a visitor belongs on; the middleware just executes the
 * returned action.
 */

/** The production apex domain. Managed = we actively route between hosts. */
export const APEX_DOMAIN = "noobstore.xyz";

/** Sticky cookie that overrides UA classification (user's explicit choice). */
export const DEVICE_OVERRIDE_COOKIE = "device-override";

/** `www.`-prefixed production host serving the desktop experience. */
export const DESKTOP_HOST = `www.${APEX_DOMAIN}`;

/** `m.`-prefixed production host serving the tuned mobile experience. */
export const MOBILE_HOST = `m.${APEX_DOMAIN}`;

/** Hosts the device gate actively manages. Everything else is left alone. */
const MANAGED_HOSTS = new Set([DESKTOP_HOST, MOBILE_HOST, APEX_DOMAIN]);

/**
 * Hosts that must NEVER be redirected: local dev, Vercel preview/deployment
 * URLs, staging tunnels. This is what makes the code safe to ship before the
 * `m.` DNS record exists — unmanaged hosts simply serve without a gate.
 */
export function isManagedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return MANAGED_HOSTS.has(host);
}

/**
 * Classify a user agent into a coarse device class.
 *
 * - Phones (iPhone, iPod, Android with the `Mobile` token, Windows Phone…)
 *   → mobile
 * - Tablets (iPad, Android WITHOUT the `Mobile` token) → desktop per product
 *   decision: they have the screen real estate for the desktop layout
 * - "Request Desktop Website" mode strips `Mobile`/`iPhone` from the UA, so a
 *   tablet pretending to be a Mac lands on desktop — correct behavior either
 *   way, since tablets are desktop-class
 * - Desktop browsers → desktop (the final fallback)
 */
export function classifyDevice(
  userAgent: string | null | undefined,
): DeviceClass {
  if (!userAgent) return "desktop";

  const ua = userAgent.toLowerCase();

  // Phone-only tokens first: some legacy UAs (Windows Phone) embed an
  // "Android" compat token, which would trip the tablet rule below.
  if (
    ua.includes("windows phone") ||
    ua.includes("iemobile") ||
    ua.includes("blackberry") ||
    ua.includes("opera mini") ||
    ua.includes("opera mobi")
  ) {
    return "mobile";
  }

  // Tablets next: an Android-tablet UA contains "android" but NOT "mobile",
  // so the tablet check must precede the Android-phone rule below.
  const isTablet =
    ua.includes("ipad") || (ua.includes("android") && !ua.includes("mobile"));

  if (isTablet) return "desktop";

  const isPhone =
    ua.includes("iphone") ||
    ua.includes("ipod") ||
    (ua.includes("android") && ua.includes("mobile")) ||
    /\bmobile\b/.test(ua);

  return isPhone ? "mobile" : "desktop";
}

/** Normalize the sticky-cookie value into a DeviceClass (or null). */
function normalizeOverride(value: string | undefined): DeviceClass | null {
  if (value === "mobile" || value === "desktop") return value;
  return null;
}

/** The host a device class should be served from. */
export function targetHostFor(deviceClass: DeviceClass): string {
  return deviceClass === "mobile" ? MOBILE_HOST : DESKTOP_HOST;
}

/**
 * Resolve the full routing decision for a request.
 *
 * Precedence: sticky override cookie → UA classification. The caller (edge
 * middleware) preserves path + query when executing a redirect, and skips the
 * gate entirely for the `?noredirect` escape and API routes — those concerns
 * stay out of this pure layer.
 */
export function resolveDeviceRouting(input: {
  hostname: string;
  userAgent: string | null | undefined;
  overrideCookie: string | undefined;
  /**
   * Whether the `m.` subdomain split is live. Defaults to off until the DNS
   * record exists — keeps everyone on the current host (no redirects) while
   * still classifying devices and forwarding `x-device-class`.
   */
  mobileSubdomainEnabled?: boolean;
}): DeviceResolution {
  const { hostname, userAgent, overrideCookie, mobileSubdomainEnabled = false } =
    input;
  const host = hostname.toLowerCase();

  const override = normalizeOverride(overrideCookie);
  const deviceClass: DeviceClass = override ?? classifyDevice(userAgent);
  const overrideApplied = override !== null;

  if (mobileSubdomainEnabled && isManagedHost(host) && host !== targetHostFor(deviceClass)) {
    return {
      action: {
        kind: "redirect",
        deviceClass,
        targetHost: targetHostFor(deviceClass),
      },
      overrideApplied,
    };
  }

  return { action: { kind: "serve", deviceClass }, overrideApplied };
}
