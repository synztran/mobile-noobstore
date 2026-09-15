/**
 * Desktop module contract types — the single source for device routing.
 * Pure data only: no React, no Next.js, no server-only imports, so both the
 * Edge middleware and client components can consume them.
 */

/** Coarse client class used for domain routing and shell selection. */
export type DeviceClass = "mobile" | "desktop";

/**
 * What the middleware should do for a request after device resolution.
 * `redirect` carries the exact host to 307 to (path + query are preserved by
 * the caller). `serve` means the request already sits on the right host.
 */
export type DeviceRoutingAction =
  | { kind: "serve"; deviceClass: DeviceClass }
  | { kind: "redirect"; deviceClass: DeviceClass; targetHost: string };

/** Result of resolving a request's device + host into a routing action. */
export interface DeviceResolution {
  action: DeviceRoutingAction;
  /** Sticky user override won over UA sniffing this request. */
  overrideApplied: boolean;
}
