import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signUpUser } from "@/modules/user/server/auth";
import { getAuthLimiter, getRateLimitKey } from "@/lib/redis/ratelimit";
import { notifyNewUserRegistered } from "@/lib/telegram/telegram.service";

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
          headers: {
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }
  } catch (rateLimitError) {
    console.warn("[signup] rate limiter unavailable:", rateLimitError);
  }

  const body = await req.json();
  const { email, password, fullName, captchaToken } = body as {
    email?: string;
    password?: string;
    fullName?: string;
    captchaToken?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email và mật khẩu là bắt buộc" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const result = await signUpUser(supabase, {
    email,
    password,
    fullName,
    captchaToken,
    emailRedirectTo: new URL("/verified-success", req.url).toString(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Announce the signup from here rather than from an unauthenticated endpoint.
  // The register form runs before the user has a session (email confirmation is
  // required), so a public notify route was the only option — but that also let
  // anyone POST arbitrary names/emails into the store's Telegram channel. Now
  // the notification fires only for a genuine new account, identified by
  // Supabase itself, and there is no route left for an anonymous caller to abuse.
  // Non-fatal: a notification failure must never fail registration.
  if (result.created) {
    try {
      await notifyNewUserRegistered({
        fullName: fullName?.trim() || email,
        email,
      });
    } catch (notifyErr) {
      console.error("[signup] Telegram notification failed:", notifyErr);
    }
  }

  return NextResponse.json({ ok: true });
}
