import { invalidateCache } from "@/lib/redis/cache";
import { getAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface CampaignRow {
	id: string;
	title: string;
	subtitle: string | null;
	image_url: string | null;
	cta_text: string | null;
	cta_link: string | null;
	is_active: boolean;
	priority: number;
	created_at: string | null;
}

export async function GET() {
	try {
		const supabase = getAdminClient();
		const { data, error } = await (supabase
			.from("hero_campaigns")
			.select("id, title, subtitle, image_url, cta_text, cta_link, is_active, priority, created_at")
			.order("priority", { ascending: false })
			.order("created_at", { ascending: false }) as unknown as PromiseLike<{
				data: CampaignRow[] | null;
				error: unknown;
			}>);

		if (error) throw error;
		return NextResponse.json(data ?? []);
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { title, subtitle, image_url, cta_text, cta_link, is_active, priority } = body;

		if (!title?.trim()) {
			return NextResponse.json({ error: "Title is required" }, { status: 400 });
		}

		const supabase = getAdminClient();
		const { data, error } = await (supabase
			.from("hero_campaigns")
			.insert({
				title: title.trim(),
				subtitle: subtitle?.trim() ?? null,
				description: "",
				image_url: image_url?.trim() ?? "",
				cta_text: cta_text?.trim() ?? null,
				cta_link: cta_link?.trim() ?? null,
				is_active: is_active ?? true,
				priority: priority ?? 0,
			} as unknown as never)
			.select("id")
			.single() as unknown as PromiseLike<{
				data: { id: string } | null;
				error: unknown;
			}>);

		if (error) throw error;

		await invalidateCache("home:hero");

		return NextResponse.json(data, { status: 201 });
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
