import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const body = await req.json();
		const { is_visible, reply } = body;

		const client = getAdminClient() as any;
		const updates: Record<string, unknown> = {};

		if (is_visible !== undefined) updates.is_visible = is_visible;
		if (reply !== undefined) updates.reply = reply;

		const { error } = await client
			.from("product_reviews")
			.update(updates)
			.eq("id", id);

		if (error) throw error;
		return NextResponse.json({ success: true });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		const client = getAdminClient() as any;
		const { error } = await client
			.from("product_reviews")
			.delete()
			.eq("id", id);

		if (error) throw error;
		return NextResponse.json({ success: true });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
