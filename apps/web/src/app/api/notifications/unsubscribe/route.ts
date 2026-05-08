import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface UnsubscribeBody {
	endpoint: string;
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Partial<UnsubscribeBody>;

		if (!body.endpoint) {
			return NextResponse.json(
				{ error: "endpoint is required" },
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
				update: (row: { is_active: boolean; last_seen_at: string }) => {
					eq: (
						column: string,
						value: string,
					) => {
						eq: (
							column: string,
							value: string,
						) => Promise<{ error: { message: string } | null }>;
					};
				};
			}
		)("push_subscriptions")
			.update({
				is_active: false,
				last_seen_at: new Date().toISOString(),
			})
			.eq("endpoint", body.endpoint)
			.eq("user_id", user.id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[notifications/unsubscribe] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
