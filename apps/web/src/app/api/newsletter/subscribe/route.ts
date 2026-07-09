import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: "Email không được để trống" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Email không đúng định dạng" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await (supabase as any)
      .from("newsletter_subscribers")
      .insert({ email });

    if (error) {
      if (error.message?.includes("duplicate") || error.code === "23505") {
        return NextResponse.json(
          { error: "Email này đã đăng ký rồi" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[newsletter/subscribe] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
