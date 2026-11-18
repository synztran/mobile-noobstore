import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getAdminDiagram } from "@/lib/diagrams";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error || profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const diagram = getAdminDiagram(slug);
  if (!diagram) {
    return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "diagrams", diagram.file);
  let html: string;
  try {
    html = await readFile(filePath, "utf8");
  } catch {
    return NextResponse.json({ error: "Diagram file unavailable" }, { status: 404 });
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline' data: blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
