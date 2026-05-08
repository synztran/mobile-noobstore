import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface PushSelfBody {
	title: string;
	body: string;
	deepLink?: string;
	type?: string;
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<PushSelfBody>;

		if (!body.title || !body.body) {
			return NextResponse.json(
				{ error: "title and body are required" },
				{ status: 400 },
			);
		}

		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { data: inserted, error: insertError } = await (
			supabase.from as unknown as (table: string) => {
				insert: (row: {
					user_id: string;
					title: string;
					body: string;
					type: string;
					deep_link: string;
				}) => {
					select: (columns: string) => {
						single: () => Promise<{
							data: { id: string } | null;
							error: { message: string } | null;
						}>;
					};
				};
			}
		)("user_notifications")
			.insert({
				user_id: user.id,
				title: body.title,
				body: body.body,
				type: body.type ?? "general",
				deep_link: body.deepLink ?? "/profile/notifications",
			})
			.select("id")
			.single();

		if (insertError || !inserted) {
			return NextResponse.json(
				{
					error:
						insertError?.message ?? "Failed to create notification",
				},
				{ status: 500 },
			);
		}

		const { data: subs } = await (
			supabase.from as unknown as (table: string) => {
				select: (columns: string) => {
					eq: (
						column: string,
						value: string,
					) => {
						eq: (
							column: string,
							value: boolean,
						) => Promise<{
							data: Array<{
								endpoint: string;
								p256dh: string;
								auth: string;
							}> | null;
							error: { message: string } | null;
						}>;
					};
				};
			}
		)("push_subscriptions")
			.select("endpoint, p256dh, auth")
			.eq("user_id", user.id)
			.eq("is_active", true);

		const subscriptions = subs ?? [];
		if (subscriptions.length > 0) {
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			const secret = process.env.NOTIFICATION_INTERNAL_SECRET;

			if (supabaseUrl && secret) {
				await fetch(`${supabaseUrl}/functions/v1/send-web-push`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-notification-secret": secret,
					},
					body: JSON.stringify({
						subscriptions,
						payload: {
							title: body.title,
							body: body.body,
							deepLink: body.deepLink ?? "/profile/notifications",
							notificationId: inserted.id,
							icon: "/icon-192.png",
							badge: "/icon-192.png",
						},
					}),
				});
			}
		}

		return NextResponse.json({ success: true, id: inserted.id });
	} catch (err) {
		console.error("[notifications/push-self] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
