"use client";

/**
 * Shared "session expired" signalling for client-side mutations and pages.
 *
 * When an authenticated API route answers `401`, the client's cached session
 * (from `supabase.auth.getSession()`) no longer matches what the server can
 * verify — the cookie is expired or its refresh token was rotated away. The
 * mutation error handlers below use `LoginRequiredError` to recognise that
 * case and route the user to /login instead of silently toasting a "need
 * login" message while the rest of the UI still claims to be signed in.
 */

export class LoginRequiredError extends Error {
  constructor(message = "Vui lòng đăng nhập để tiếp tục") {
    super(message);
    this.name = "LoginRequiredError";
  }
}

/** Current path + query to carry through the login redirect. */
export function currentLoginNext(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname + window.location.search;
}

/** Absolute `/login` URL preserving the current page as `next`. */
export function loginUrl(): string {
  return `/login?next=${encodeURIComponent(currentLoginNext())}`;
}

/** Push to /login?next=<current page> via a Next router. */
export function redirectToLogin(router: { push: (url: string) => void }): void {
  router.push(loginUrl());
}