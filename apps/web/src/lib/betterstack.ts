import "server-only";

const BETTERSTACK_BASE = "https://uptime.betterstack.com/api/v3";

/**
 * Default notification channels for incidents created from this app.
 * `email` + `push` so you actually get paged without enabling expensive
 * call/SMS channels. Override per-call via `BetterStackAlert.channels`.
 */
export const PAGE_CHANNELS = {
  call: false,
  sms: false,
  email: true,
  push: true,
};

/**
 * Highest-severity paging for the outage detector (health check):
 * phone call + SMS so an actual outage wakes you even with email/push muted.
 */
export const HEALTH_PAGE_CHANNELS = {
  call: true,
  sms: true,
  email: true,
  push: true,
};

/**
 * Better Stack API client for incident creation/acknowledge/resolve.
 *
 * Better Stack resolves incidents by ID (not by a custom alias), so callers
 * that need auto-resolve must capture the ID returned from `bsTrigger`.
 * This is exposed on the response as `.data.id`.
 */
export type BetterStackSeverity = "low" | "medium" | "high" | "critical";

export interface BetterStackAlert {
  /** Incident title */
  summary: string;
  /** Longer description ("cause") */
  cause?: string;
  /** Custom metadata key/value pairs */
  metadata?: Record<string, { value: string }>;
  /** Notification channels for the primary responder (default: all on) */
  channels?: {
    call?: boolean;
    sms?: boolean;
    email?: boolean;
    push?: boolean;
  };
  /** Escalation policy id — overrides notifying the primary responder */
  policyId?: string;
  /**
   * Seconds to wait before alerting the whole team. Default 180.
   * Set to null to never alert the team.
   */
  teamWait?: number | null;
}

export interface BetterStackIncident {
  id: string;
  url?: string;
}

export interface BetterStackResponse {
  data?: BetterStackIncident;
  errors?: Array<{ attribute?: string; message?: string }>;
  error?: string;
}

function headers(): Record<string, string> | null {
  const token = process.env.BETTERSTACK_TOKEN;
  if (!token) {
    console.error("[betterstack] BETTERSTACK_TOKEN is not set — skipping.");
    return null;
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Create an incident. Returns the incident id via `data.id`.
 */
export async function bsTrigger(
  event: BetterStackAlert,
): Promise<BetterStackResponse> {
  const h = headers();
  if (!h) return { error: "Token not configured" };

  const requesterEmail = process.env.BETTERSTACK_REQUESTER_EMAIL ?? "";

  const channels = event.channels ?? PAGE_CHANNELS;

  const res = await fetch(`${BETTERSTACK_BASE}/incidents`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      summary: event.summary,
      cause: event.cause,
      requester_email: requesterEmail,
      metadata: event.metadata,
      ...channels,
      ...(event.policyId ? { policy_id: event.policyId } : {}),
      ...(event.teamWait !== undefined ? { team_wait: event.teamWait } : {}),
    }),
  });

  return res.json() as Promise<BetterStackResponse>;
}

/**
 * Acknowledge an incident by id.
 */
export async function bsAcknowledge(id: string): Promise<BetterStackResponse> {
  const h = headers();
  if (!h) return { error: "Token not configured" };

  const res = await fetch(`${BETTERSTACK_BASE}/incidents/${id}/acknowledge`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({}),
  });

  return res.json() as Promise<BetterStackResponse>;
}

/**
 * Resolve an incident by id.
 */
export async function bsResolve(id: string): Promise<BetterStackResponse> {
  const h = headers();
  if (!h) return { error: "Token not configured" };

  const res = await fetch(`${BETTERSTACK_BASE}/incidents/${id}/resolve`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({}),
  });

  return res.json() as Promise<BetterStackResponse>;
}

/**
 * Look up an open incident by its Source metadata value (our dedup key).
 * Returns the first matching incident id, or null.
 */
export async function bsFindBySource(
  source: string,
): Promise<string | null> {
  const h = headers();
  if (!h) return null;

  const res = await fetch(`${BETTERSTACK_BASE}/incidents`, {
    method: "GET",
    headers: h,
  });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    data?: Array<{
      id: string;
      attributes?: {
        name?: string;
        metadata?: Record<string, { value?: string }>;
      };
    }>;
  };

  const incidents = json.data ?? [];
  return incidents.find((i) => i.attributes?.metadata?.Source?.value === source)?.id ?? null;
}
