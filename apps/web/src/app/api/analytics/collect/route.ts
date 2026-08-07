import {
	MAX_EVENTS_PER_REQUEST,
	normalizeClientId,
	sanitizeEventName,
	sendEvents,
	type GA4EventInput,
} from "@/lib/analytics/ga4";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface CollectBody {
	client_id?: unknown;
	user_id?: unknown;
	session_id?: unknown;
	events?: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: Request) {
	let body: CollectBody;
	try {
		body = (await req.json()) as CollectBody;
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	if (typeof body.client_id !== "string") {
		return NextResponse.json(
			{ error: "client_id is required" },
			{ status: 400 }
		);
	}

	if (!normalizeClientId(body.client_id)) {
		return NextResponse.json(
			{ error: "client_id is invalid" },
			{ status: 400 }
		);
	}

	if (!Array.isArray(body.events) || body.events.length === 0) {
		return NextResponse.json(
			{ error: "events is required" },
			{ status: 400 }
		);
	}

	if (body.events.length > MAX_EVENTS_PER_REQUEST) {
		return NextResponse.json(
			{ error: `Too many events (max ${MAX_EVENTS_PER_REQUEST})` },
			{ status: 400 }
		);
	}

	const events: GA4EventInput[] = [];
	for (const event of body.events) {
		if (!isPlainObject(event) || typeof event.name !== "string") continue;
		if (!sanitizeEventName(event.name)) continue;

		events.push({
			name: event.name,
			params: isPlainObject(event.params) ? event.params : undefined,
		});
	}

	if (events.length === 0) {
		return NextResponse.json(
			{ error: "No valid events to send" },
			{ status: 400 }
		);
	}

	const result = await sendEvents({
		client_id: body.client_id,
		user_id: typeof body.user_id === "string" ? body.user_id : undefined,
		session_id:
			typeof body.session_id === "string" || typeof body.session_id === "number"
				? body.session_id
				: undefined,
		events,
	});

	if (!result.ok) {
		console.error("[analytics/collect] send failed:", result.error);
		return NextResponse.json(
			{ error: result.error ?? "Failed to forward to GA4" },
			{ status: 502 }
		);
	}

	// Dev /debug/mp/collect returns validation messages alongside 200.
	if (result.validationMessages && result.validationMessages.length > 0) {
		return NextResponse.json(
			{ validationMessages: result.validationMessages },
			{ status: 200 }
		);
	}

	return new NextResponse(null, { status: 204 });
}
