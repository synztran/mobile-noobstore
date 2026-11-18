"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: String(form.get("email") ?? ""), password: String(form.get("password") ?? "") });
      if (signInError) setError("Sign-in failed. Check your credentials and try again.");
      else window.location.assign("/");
    } catch {
      setError("Supabase Auth is not configured for this environment.");
    } finally {
      setLoading(false);
    }
  }
  return <main className="w-auth"><section className="w-auth-card"><div className="w-kicker">NoobStore operations</div><h1 className="w-title">Warehouse login</h1><p className="w-sub">Use your existing admin account. Warehouse access is limited to admins.</p><form onSubmit={submit} style={{ display: "grid", gap: 14, marginTop: 24 }}><label className="w-field">Email<input name="email" type="email" autoComplete="username" required /></label><label className="w-field">Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <div className="w-error" role="alert">{error}</div>}<button className="w-btn w-btn-primary" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form></section></main>;
}
