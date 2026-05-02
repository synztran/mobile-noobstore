import { notifyNewUserRegistered } from "@/lib/telegram/telegram.service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RegisterNotificationBody {
	fullName: string;
	email: string;
}

export async function POST(req: Request) {
	let body: RegisterNotificationBody;

	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
	}

	const { fullName, email } = body;

	if (!fullName || !email) {
		return NextResponse.json(
			{ error: "fullName and email are required" },
			{ status: 400 },
		);
	}

	await notifyNewUserRegistered({ fullName, email });

	return NextResponse.json({ ok: true });
}
