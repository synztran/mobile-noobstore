import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_INVOICE_LAYOUT, normalizeInvoiceLayout } from "@/lib/invoices/layout";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
	const supabase = getAdminClient();
	const db = supabase as unknown as { from: (table: string) => any };
	const { data, error } = await (db
		.from("invoice_layout_settings")
		.select("sections")
		.eq("id", true)
		.maybeSingle() as PromiseLike<{ data: { sections: unknown } | null; error: { message: string } | null }>);

	if (error) {
		console.error("[invoice-layout] read failed", error);
		return NextResponse.json({ error: "Unable to load invoice layout" }, { status: 500 });
	}

	return NextResponse.json({ sections: normalizeInvoiceLayout(data?.sections ?? DEFAULT_INVOICE_LAYOUT) });
}

export async function PUT(request: NextRequest) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}
	if (!body || typeof body !== "object" || !Array.isArray((body as { sections?: unknown }).sections)) {
		return NextResponse.json({ error: "sections must be an array" }, { status: 400 });
	}

	const sections = normalizeInvoiceLayout((body as { sections: unknown }).sections);
	const supabase = getAdminClient();
	const db = supabase as unknown as { from: (table: string) => any };
	const { error } = await db
		.from("invoice_layout_settings")
		.upsert({ id: true, sections, updated_at: new Date().toISOString() }, { onConflict: "id" });

	if (error) {
		console.error("[invoice-layout] write failed", error);
		return NextResponse.json({ error: "Unable to save invoice layout" }, { status: 500 });
	}
	return NextResponse.json({ sections });
}
