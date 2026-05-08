import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface NotificationItem {
	id: string;
	title: string;
	body: string;
	type: string;
	deep_link: string | null;
	metadata: unknown;
	read_at: string | null;
	created_at: string;
}

export async function GET(req: NextRequest) {
	try {
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

		const { searchParams } = new URL(req.url);
		const limit = Math.min(
			100,
			Math.max(1, Number(searchParams.get("limit") ?? 30)),
		);

		const { data, error } = await (
			supabase.from as unknown as (table: string) => {
				select: (columns: string) => {
					eq: (
						column: string,
						value: string,
					) => {
						order: (
							column: string,
							options: { ascending: boolean },
						) => {
							limit: (value: number) => Promise<{
								data: NotificationItem[] | null;
								error: { message: string } | null;
							}>;
						};
					};
				};
			}
		)("user_notifications")
			.select(
				"id, title, body, type, deep_link, metadata, read_at, created_at",
			)
			.eq("user_id", user.id)
			.order("created_at", { ascending: false })
			.limit(limit);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ notifications: data ?? [] });
	} catch (err) {
		console.error("[notifications] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
