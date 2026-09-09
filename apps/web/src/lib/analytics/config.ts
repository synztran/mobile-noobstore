/**
 * Isomorphic tracking config.
 *
 * A single opt-out flag gates ALL analytics/tracking:
 *   NEXT_PUBLIC_TRACKING_ENABLED=false  -> tracking fully disabled
 *   (default)                            -> tracking enabled
 *
 * On top of the flag, tracking is never sent from non-production
 * environments (local dev, Vercel preview/staging).
 */

const TRACKING_FLAG = process.env.NEXT_PUBLIC_TRACKING_ENABLED;

/**
 * True unless the opt-out flag is explicitly set to "false".
 */
export const trackingFlagEnabled = TRACKING_FLAG !== "false";

/**
 * Resolve the deployment environment. Prefers the Vercel env when present,
 * falls back to NODE_ENV (client builds inline these at compile time).
 */
function resolveRuntimeEnv(): string {
  return (
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.NODE_ENV ??
    "production"
  );
}

/**
 * Whether tracking is allowed to run: flag enabled (default true)
 * AND running in production only — no dev/stg tracking.
 */
export function isTrackingEnabled(): boolean {
  return trackingFlagEnabled && resolveRuntimeEnv() === "production";
}