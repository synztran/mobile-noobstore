import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface SubscribeBody {
	endpoint: string;
	p256dh: string;
	auth: string;
	userAgent?: string;
	devicePlatform?: string;
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<SubscribeBody>;

		if (!body.endpoint || !body.p256dh || !body.auth) {
			return NextResponse.json(
				{ error: "endpoint, p256dh and auth are required" },
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

		const { error } = await (
			supabase.from as unknown as (table: string) => {
				upsert: (
					row: {
						user_id: string;
						endpoint: string;
						p256dh: string;
						auth: string;
						user_agent: string | null;
						device_platform: string | null;
						is_active: boolean;
						last_seen_at: string;
					},
					options: { onConflict: string },
				) => Promise<{ error: { message: string } | null }>;
			}
		)("push_subscriptions").upsert(
			{
				user_id: user.id,
				endpoint: body.endpoint,
				p256dh: body.p256dh,
				auth: body.auth,
				user_agent: body.userAgent ?? null,
				device_platform: body.devicePlatform ?? null,
				is_active: true,
				last_seen_at: new Date().toISOString(),
			},
			{ onConflict: "endpoint" },
		);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[notifications/subscribe] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
