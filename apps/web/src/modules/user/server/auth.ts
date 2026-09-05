import "server-only";

import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

const SIGNIN_ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Tài khoản hoặc mật khẩu không chính xác!",
  "Email not confirmed": "Email chưa được xác thực. Vui lòng kiểm tra hộp thư.",
  "User not found": "Tài khoản không tồn tại!",
  "Invalid email or password": "Tài khoản hoặc mật khẩu không chính xác!",
  "Too many requests": "Quá nhiều lần thử. Vui lòng đợi một chút.",
};

const SIGNUP_ERROR_MAP: Record<string, string> = {
  "User already registered": "Email này đã được đăng ký!",
  "Invalid email": "Định dạng email không hợp lệ!",
  "Password should be at least 6 characters":
    "Mật khẩu phải có ít nhất 6 ký tự!",
  "Too many requests": "Quá nhiều lần thử. Vui lòng đợi một chút.",
  "Signups not allowed": "Đăng ký tạm thời bị khóa. Vui lòng liên hệ hỗ trợ.",
};

export type AuthFlowResult = { ok: true } | { ok: false; error: string };

export async function signInWithPassword(
  supabase: Supabase,
  credentials: {
    email: string;
    password: string;
    captchaToken?: string;
  }
): Promise<AuthFlowResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
    ...(credentials.captchaToken
      ? { options: { captchaToken: credentials.captchaToken } }
      : {}),
  });

  if (error) {
    return { ok: false, error: SIGNIN_ERROR_MAP[error.message] ?? error.message };
  }

  return { ok: true };
}

export async function signUpUser(
  supabase: Supabase,
  input: {
    email: string;
    password: string;
    fullName?: string;
    captchaToken?: string;
    emailRedirectTo: string;
  }
): Promise<AuthFlowResult> {
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { full_name: input.fullName },
      ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
      emailRedirectTo: input.emailRedirectTo,
    },
  });

  if (error) {
    return { ok: false, error: SIGNUP_ERROR_MAP[error.message] ?? error.message };
  }

  return { ok: true };
}
