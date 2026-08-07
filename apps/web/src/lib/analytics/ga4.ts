/**
 * Server-only GA4 Measurement Protocol module.
 *
 * Builds and sends events to the GA4 Measurement Protocol endpoint.
 * The `api_secret` is read from server env vars and MUST NEVER be exposed
 * to the browser — do not import this module from any client component.
 */

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
const GA4_API_SECRET = process.env.GA4_MP_API_SECRET;

const GA4_MP_ENDPOINT = "https://www.google-analytics.com/mp/collect";
const GA4_MP_DEBUG_ENDPOINT = "https://www.google-analytics.com/debug/mp/collect";

export const MAX_EVENTS_PER_REQUEST = 25;

/** Prefix applied to every event name sent from this store. */
export const GA4_EVENT_PREFIX = "NSM_";

export interface GA4EventInput {
	name: string;
	params?: Record<string, unknown>;
}

export interface SendEventsInput {
	client_id: string;
	user_id?: string;
	session_id?: string | number;
	events: GA4EventInput[];
}

export interface SendEventsResult {
	ok: boolean;
	status?: number;
	validationMessages?: unknown[];
	error?: string;
}

/**
 * Normalize an event name to GA4 constraints:
 * lowercase, alphanumeric + underscore, <= 40 chars, must start with a letter.
 */
export function sanitizeEventName(eventName: string): string {
	const normalized = (eventName || "").trim().toLowerCase().replace(/\s+/g, "_");
	const safeName = normalized
		.replace(/[^a-z0-9_]/g, "_")
		.replace(/_+/g, "_")
		.replace(/^_+|_+$/g, "");

	if (!safeName) return "";

	const startsWithLetter = /^[a-z]/.test(safeName);
	const candidate = startsWithLetter ? safeName : `evt_${safeName}`;
	return candidate.slice(0, 40);
}

/**
 * Convert an ISO date / epoch ms into GA4 microsecond timestamps.
 * Falls back to now when the input cannot be parsed.
 */
export function toTimestampMicros(value?: string | number): number {
	const raw =
		typeof value === "number" ? value : Date.parse(value || "");
	const timestamp = Number.isNaN(raw) ? Date.now() : raw;
	return Math.floor(timestamp) * 1000;
}

/**
 * Build a positive numeric session_id for GA4 realtime/session attribution.
 */
export function normalizeSessionId(raw?: string | number): number {
	const digitsOnly = `${raw ?? ""}`.replace(/\D/g, "");

	if (digitsOnly) {
		const numericSessionId = Number.parseInt(digitsOnly.slice(0, 15), 10);
		if (Number.isFinite(numericSessionId) && numericSessionId > 0) {
			return numericSessionId;
		}
	}

	return Math.floor(Date.now() / 1000);
}

/**
 * Trim + validate a GA4 client_id. Returns "" when invalid.
 */
export function normalizeClientId(raw?: string): string {
	const clientId = `${raw ?? ""}`.trim();
	return /^[a-zA-Z0-9._-]{6,}$/.test(clientId) ? clientId : "";
}

/**
 * Resolve GA4 credentials from server env vars.
 */
export function getGa4Credentials(): {
	measurementId: string;
	apiSecret: string;
} {
	return {
		measurementId: GA4_MEASUREMENT_ID || "",
		apiSecret: GA4_API_SECRET || "",
	};
}

/**
 * Build the Measurement Protocol request body.
 * Returns null when there is nothing valid to send.
 */
export function buildMeasurementPayload(
	input: SendEventsInput
): {
	client_id: string;
	user_id?: string;
	timestamp_micros: number;
	events: { name: string; params: Record<string, unknown> }[];
} | null {
	const clientId = normalizeClientId(input.client_id);
	if (!clientId) return null;

	const sessionId = normalizeSessionId(input.session_id);
	const timestampMicros = toTimestampMicros();

	const events: { name: string; params: Record<string, unknown> }[] = [];
	for (const event of input.events.slice(0, MAX_EVENTS_PER_REQUEST)) {
		const sanitized = sanitizeEventName(event.name);
		if (!sanitized) continue;

		// GA4 custom event names are limited to 40 chars.
		const name = `${GA4_EVENT_PREFIX}${sanitized}`.slice(0, 40);

		const params = { ...(event.params ?? {}) };
		if (params.session_id == null) params.session_id = sessionId;
		if (params.event_time == null) params.event_time = new Date().toISOString();

		events.push({ name, params });
	}

	if (events.length === 0) return null;

	const body: {
		client_id: string;
		user_id?: string;
		timestamp_micros: number;
		events: { name: string; params: Record<string, unknown> }[];
	} = {
		client_id: clientId,
		timestamp_micros: timestampMicros,
		events,
	};

	if (input.user_id) body.user_id = input.user_id;

	return body;
}

/**
 * Send events to the GA4 Measurement Protocol endpoint.
 *
 * Events are always sent to the real `/mp/collect` endpoint so they are
 * actually collected and appear in GA4 reports/Realtime. The `/debug/mp/collect`
 * validation server does NOT store data, so in development we additionally call
 * it to surface validation messages without affecting collection.
 */
export async function sendEvents(input: SendEventsInput): Promise<SendEventsResult> {
	const { measurementId, apiSecret } = getGa4Credentials();

	if (!measurementId || !apiSecret) {
		return { ok: false, error: "GA4 credentials not configured" };
	}

	const payload = buildMeasurementPayload(input);
	if (!payload) {
		return { ok: false, error: "Unable to build GA4 payload" };
	}

	const query =
		`?measurement_id=${encodeURIComponent(measurementId)}` +
		`&api_secret=${encodeURIComponent(apiSecret)}`;

	const headers = { "Content-Type": "application/json" };
	const body = JSON.stringify(payload);

	// 1. Real endpoint — collects/stores the events (204 on success).
	let status: number | undefined;
	try {
		const response = await fetch(`${GA4_MP_ENDPOINT}${query}`, {
			method: "POST",
			headers,
			body,
		});
		status = response.status;

		if (!response.ok) {
			const errorText = await response.text();
			return {
				ok: false,
				status,
				error: `GA4 API error: ${response.status} ${errorText}`,
			};
		}
	} catch (error) {
		return {
			ok: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}

	const result: SendEventsResult = { ok: true, status };

	// 2. Dev only — validate against the (non-storing) validation server.
	if (process.env.NODE_ENV === "development") {
		try {
			const debugResponse = await fetch(`${GA4_MP_DEBUG_ENDPOINT}${query}`, {
				method: "POST",
				headers,
				body,
			});
			const debugBody = (await debugResponse.json()) as {
				validationMessages?: unknown[];
			};
			result.validationMessages = debugBody.validationMessages ?? [];
		} catch {
			result.validationMessages = [];
		}
	}

	return result;
}

export const _private = {
	sanitizeEventName,
	toTimestampMicros,
	normalizeSessionId,
	normalizeClientId,
	buildMeasurementPayload,
};
