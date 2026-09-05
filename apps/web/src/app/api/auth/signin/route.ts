import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signInWithPassword } from "@/modules/user/server/auth";
import { getAuthLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";

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
  const result = await signInWithPassword(supabase, {
    email,
    password,
    captchaToken,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
