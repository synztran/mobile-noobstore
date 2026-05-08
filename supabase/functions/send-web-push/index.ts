// deno-lint-ignore-file no-explicit-any
import webpush from "npm:web-push@3.6.7";

type PushSubscriptionInput = {
	endpoint: string;
	p256dh: string;
	auth: string;
};

type PushPayload = {
	title: string;
	body: string;
	deepLink?: string;
	notificationId?: string;
	icon?: string;
	badge?: string;
};

const NOTIFICATION_INTERNAL_SECRET =
	Deno.env.get("NOTIFICATION_INTERNAL_SECRET") ?? "";
const WEB_PUSH_PUBLIC_KEY = Deno.env.get("WEB_PUSH_PUBLIC_KEY") ?? "";
const WEB_PUSH_PRIVATE_KEY = Deno.env.get("WEB_PUSH_PRIVATE_KEY") ?? "";
const WEB_PUSH_SUBJECT =
	Deno.env.get("WEB_PUSH_SUBJECT") ?? "mailto:support@noobstore.app";

if (WEB_PUSH_PUBLIC_KEY && WEB_PUSH_PRIVATE_KEY) {
	webpush.setVapidDetails(
		WEB_PUSH_SUBJECT,
		WEB_PUSH_PUBLIC_KEY,
		WEB_PUSH_PRIVATE_KEY,
	);
}

Deno.serve(async (req) => {
	if (req.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	const secret = req.headers.get("x-notification-secret") ?? "";
	if (
		!NOTIFICATION_INTERNAL_SECRET ||
		secret !== NOTIFICATION_INTERNAL_SECRET
	) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (!WEB_PUSH_PUBLIC_KEY || !WEB_PUSH_PRIVATE_KEY) {
		return new Response(JSON.stringify({ error: "Missing VAPID keys" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}

	const body = (await req.json()) as {
		subscriptions: PushSubscriptionInput[];
		payload: PushPayload;
	};

	const subscriptions = body.subscriptions ?? [];
	const payload = JSON.stringify(body.payload ?? {});

	const results = await Promise.allSettled(
		subscriptions.map((sub) =>
			webpush.sendNotification(
				{
					endpoint: sub.endpoint,
					keys: { p256dh: sub.p256dh, auth: sub.auth },
				},
				payload,
			),
		),
	);

	const failedIndexes: number[] = [];
	results.forEach((result, index) => {
		if (result.status === "rejected") {
			failedIndexes.push(index);
		}
	});

	return new Response(
		JSON.stringify({
			sent: subscriptions.length - failedIndexes.length,
			failed: failedIndexes.length,
			failedIndexes,
		}),
		{ headers: { "Content-Type": "application/json" } },
	);
});
