import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface MarkReadBody {
	notificationId?: string;
	markAll?: boolean;
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as MarkReadBody;
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

		if (body.markAll) {
			const { error } = await (
				supabase.from as unknown as (table: string) => {
					update: (row: { read_at: string }) => {
						eq: (
							column: string,
							value: string,
						) => {
							is: (
								column: string,
								value: null,
							) => Promise<{ error: { message: string } | null }>;
						};
					};
				}
			)("user_notifications")
				.update({ read_at: new Date().toISOString() })
				.eq("user_id", user.id)
				.is("read_at", null);

			if (error) {
				return NextResponse.json(
					{ error: error.message },
					{ status: 500 },
				);
			}

			return NextResponse.json({ success: true });
		}

		if (!body.notificationId) {
			return NextResponse.json(
				{ error: "notificationId is required" },
				{ status: 400 },
			);
		}

		const { error } = await (
			supabase.from as unknown as (table: string) => {
				update: (row: { read_at: string }) => {
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
		)("user_notifications")
			.update({ read_at: new Date().toISOString() })
			.eq("id", body.notificationId)
			.eq("user_id", user.id);

		if (error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[notifications/read] unexpected error:", err);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
