"use client";

import type { Tables } from "@/lib/supabase/database.types";
import { useCartStore } from "@/modules/cart/client/useCartStore";
import { useCheckoutStore, useDiscountStore } from "@/store";
import { createBrowserClient } from "@supabase/ssr";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type AppUser = Tables<"users">;

/**
 * `.noobstore.xyz` in production so sessions survive the www ↔ m. device
 * redirect (see modules/desktop); host-scoped when unset (localhost dev).
 */
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
  { cookieOptions: { domain: COOKIE_DOMAIN } }
);

function clearUserCookie() {
  if (typeof document === "undefined") return;

  const cookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.trim().split("=")[0])
    .filter(
      (name) =>
        name.startsWith("sb-") &&
        (name.includes("-auth-token") || name.includes("-auth-token."))
    );

  const expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  const maxAge = "max-age=0";
  const paths = ["/"];
  const domains = [
    undefined,
    window.location.hostname,
    `.${window.location.hostname}`,
  ];

  cookieNames.forEach((name) => {
    paths.forEach((path) => {
      domains.forEach((domain) => {
        document.cookie = [
          `${name}=`,
          expires,
          maxAge,
          `path=${path}`,
          domain ? `domain=${domain}` : "",
          "SameSite=Lax",
        ]
          .filter(Boolean)
          .join("; ");
      });
    });
  });
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: AppUser | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    captchaToken?: string
  ) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    captchaToken?: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Fetch profile from your API route
  const fetchProfile = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/user/profile", {
        credentials: "include", // important if using cookies
      });

      if (!res.ok) {
        setProfile(null);
        return;
      }

      const data = await res.json();
      setProfile(data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(() => fetchProfile(), [fetchProfile]);

  // Initial session + auth listener
  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("getSession error:", error);
        }

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            void fetchProfile();
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    // 2. Listen to auth state changes
    // Skip INITIAL_SESSION (already handled by initializeAuth) and
    // TOKEN_REFRESHED (fires on every page navigation, profile hasn't changed)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;

      // Clear react-query cache on auth transitions to prevent cross-account
      // data leaks (rank, orders, profile, etc. from a previous user session)
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        queryClient.clear();
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        fetchProfile();
        if (event === "SIGNED_IN") {
          void (async () => {
            try {
              const { data: activeEvent } = await supabase
                .from("gacha_events")
                .select("id")
                .eq("is_active", true)
                .lte("start_at", new Date().toISOString())
                .gte("end_at", new Date().toISOString())
                .order("id", { ascending: true })
                .limit(1)
                .maybeSingle();

              if (activeEvent) {
                await fetch("/api/gacha/mission/progress", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_id: activeEvent.id,
                    mission_type: "login_count",
                  }),
                });
              }
            } catch {
              // Non-critical — ignore errors
            }
          })();
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Auth methods
  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const res = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, captchaToken }),
    });
    const data = await res.json();
    if (data.error) return { error: data.error ?? null };

    // Use session from API response directly (avoids cookie timing gap)
    let newSession: Session | null = data.session ?? null;

    // Fallback: read from cookies if API didn't return session
    if (!newSession) {
      const { data: sessionData } = await supabase.auth.getSession();
      newSession = sessionData.session;
    }

    // Retry once after a tick if still not found
    if (!newSession) {
      await new Promise((r) => setTimeout(r, 100));
      const { data: sessionData } = await supabase.auth.getSession();
      newSession = sessionData.session;
    }

    setSession(newSession);
    setUser(newSession?.user ?? null);
    if (newSession?.user) {
      await fetchProfile();
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, captchaToken?: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName, captchaToken }),
    });
    const data = await res.json();
    return { error: data.error ?? null };
  };

  const signOut = async () => {
    queryClient.clear();
    await supabase.auth.signOut();
    clearUserCookie();
    setSession(null);
    setUser(null);
    setProfile(null);
    useCartStore.getState().clearCart();
    useCartStore.persist.clearStorage();
    useDiscountStore.persist.clearStorage();
    useCheckoutStore.persist.clearStorage();
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // redirectTo: `https://zvjpabkpabvxfouupxgo.supabase.co/auth/v1/callback`
      },
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
