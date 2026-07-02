import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";

const ERROR_MAP: Record<string, string> = {
  "User already registered": "Email này đã được đăng ký!",
  "Invalid email": "Định dạng email không hợp lệ!",
  "Password should be at least 6 characters": "Mật khẩu phải có ít nhất 6 ký tự!",
  "Too many requests": "Quá nhiều lần thử. Vui lòng đợi một chút.",
  "Signups not allowed": "Đăng ký tạm thời bị khóa. Vui lòng liên hệ hỗ trợ.",
};

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { success, reset } = await getAuthLimiter().limit(
      getRateLimitKey(req)
    );
    if (!success) {
      return NextResponse.json(
        { error: "Quá nhiều lần đăng ký. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) },
        }
      );
    }
  } catch (rateLimitError) {
    console.warn("[signup] rate limiter unavailable:", rateLimitError);
  }

  const body = await req.json();
  const { email, password, fullName } = body as { email?: string; password?: string; fullName?: string };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email và mật khẩu là bắt buộc" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    const viMessage = ERROR_MAP[error.message] ?? error.message;
    return NextResponse.json({ error: viMessage }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}