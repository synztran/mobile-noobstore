import { invalidateCache } from "@/lib/redis/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;
		const body = await req.json();
		const { title, subtitle, image_url, image_url_mobile, cta_text, cta_link, is_active, priority } = body;

		const supabase = getAdminClient();
		const updates: Record<string, unknown> = {};

		if (title !== undefined) updates.title = title.trim();
		if (subtitle !== undefined) updates.subtitle = subtitle?.trim() ?? null;
		if (image_url !== undefined) updates.image_url = image_url?.trim() ?? null;
		if (image_url_mobile !== undefined) updates.image_url_mobile = image_url_mobile?.trim() ?? null;
		if (cta_text !== undefined) updates.cta_text = cta_text?.trim() ?? null;
		if (cta_link !== undefined) updates.cta_link = cta_link?.trim() ?? null;
		if (is_active !== undefined) updates.is_active = is_active;
		if (priority !== undefined) updates.priority = priority;

		const { data, error } = await (supabase
			.from("hero_campaigns")
			.update(updates as unknown as never)
			.eq("id", id)
			.select("id")
			.single() as unknown as PromiseLike<{
				data: { id: string } | null;
				error: unknown;
			}>);

		if (error) throw error;

		await invalidateCache("home:hero");

		return NextResponse.json(data);
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

		const supabase = getAdminClient();
		const { error } = await supabase.from("hero_campaigns").delete().eq("id", id);

		if (error) throw error;

		await invalidateCache("home:hero");

		return NextResponse.json({ success: true });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
