"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { type ComponentType, useEffect, useRef } from "react";

type WithAuthRedirectOptions = {
  redirectTo?: string;
};

export function withAuthRedirect<P extends object>(
  WrappedComponent: ComponentType<P>,
  options?: WithAuthRedirectOptions
) {
  const redirectTo = options?.redirectTo ?? "/login";

  function WithAuthRedirectComponent(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const hydrated = useRef(false);

    useEffect(() => {
      if (!loading) {
        hydrated.current = true;
      }
    }, [loading]);

    useEffect(() => {
      if (!loading && !user && hydrated.current) {
        const currentPath = window.location.pathname + window.location.search;
        router.push(`${redirectTo}?next=${encodeURIComponent(currentPath)}`);
      }
    }, [loading, user, router, redirectTo]);

    if (loading || !user) {
      return null;
    }

    return <WrappedComponent {...props} />;
  }

  const wrappedName =
    WrappedComponent.displayName || WrappedComponent.name || "Component";
  WithAuthRedirectComponent.displayName = `withAuthRedirect(${wrappedName})`;

  return WithAuthRedirectComponent;
}
