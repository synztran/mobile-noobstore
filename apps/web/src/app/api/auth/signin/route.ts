import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";

const ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Tài khoản hoặc mật khẩu không chính xác!",
  "Email not confirmed": "Email chưa được xác thực. Vui lòng kiểm tra hộp thư.",
  "User not found": "Tài khoản không tồn tại!",
  "Invalid email or password": "Tài khoản hoặc mật khẩu không chính xác!",
  "Too many requests": "Quá nhiều lần thử. Vui lòng đợi một chút.",
};

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { success, reset } = await getAuthLimiter().limit(
      getRateLimitKey(req)
    );
    if (!success) {
      return NextResponse.json(
        { error: "Quá nhiều lần đăng nhập. Vui lòng thử lại sau." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) },
        }
      );
    }
  } catch (rateLimitError) {
    console.warn("[signin] rate limiter unavailable:", rateLimitError);
  }

  const body = await req.json();
  const { email, password, captchaToken } = body as {
    email?: string;
    password?: string;
    captchaToken?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email và mật khẩu là bắt buộc" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    ...(captchaToken ? { options: { captchaToken } } : {}),
  });

  if (error) {
    const viMessage = ERROR_MAP[error.message] ?? error.message;
    return NextResponse.json({ error: viMessage }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}