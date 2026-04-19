import { NextResponse } from "next/server";

// The fees table has been removed. Use /api/services instead.
export async function GET() {
	return NextResponse.json(
		{ error: "This endpoint is deprecated. Use /api/services instead." },
		{ status: 410 },
	);
}
