import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BUCKET = "ticket-attachments";
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/heic",
	"image/heif",
	"video/mp4",
	"video/quicktime",
]);

// ─── POST /api/service-bookings/attachments ──────────────────────────────────
// Uploads repair-issue photos/videos for the authenticated user and returns
// storage paths. Paths are exchanged for public URLs by /api/service-bookings.

export async function POST(req: NextRequest) {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	let formData: FormData;
	try {
		formData = await req.formData();
	} catch {
		return NextResponse.json(
			{ error: "multipart/form-data body required" },
			{ status: 400 },
		);
	}

	const files = formData.getAll("files").filter((f): f is File => f instanceof File);

	if (files.length === 0) {
		return NextResponse.json({ error: "files are required" }, { status: 400 });
	}
	if (files.length > MAX_FILES) {
		return NextResponse.json(
			{ error: `at most ${MAX_FILES} files per upload` },
			{ status: 400 },
		);
	}

	const uploads: Array<{ path: string; url: string }> = [];
	for (const file of files) {
		if (file.size === 0 || file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ error: `file ${file.name} is empty or exceeds 10MB` },
				{ status: 400 },
			);
		}
		if (file.type && !ALLOWED_MIME.has(file.type)) {
			return NextResponse.json(
				{ error: `file type ${file.type} is not allowed` },
				{ status: 400 },
			);
		}

		const ext = file.name.split(".").pop() || "jpg";
		const filePath = `${user.id}/service-bookings/${Date.now()}-${Math.random()
			.toString(36)
			.slice(2, 8)}.${ext}`;

		const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
			contentType: file.type,
			upsert: false,
		});
		if (error) {
			return NextResponse.json(
				{ error: `failed to upload ${file.name}` },
				{ status: 500 },
			);
		}
		const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
		uploads.push({ path: filePath, url: data.publicUrl });
	}

	return NextResponse.json({ uploads }, { status: 201 });
}
