"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { type ComponentType, useEffect } from "react";

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

    useEffect(() => {
      if (!loading && !user) {
        router.push(redirectTo);
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
