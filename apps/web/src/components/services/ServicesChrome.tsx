"use client";

import { TopNav } from "@/components/layout/TopNav";
import { useCallback, useRef, type ReactNode } from "react";
import { ServicesTour } from "./ServicesTour";

/**
 * The interactive shell around the services page.
 *
 * `page.tsx` has to be a server component now: the service showcase must be in
 * the first HTML response, which means the page awaits Supabase itself. But the
 * help button in `TopNav` starts the driver.js tour, and a tour trigger is a
 * function — which a server component cannot pass to a client component. So the
 * ref glue lives here and the page's content is passed through as children,
 * which keeps it server-rendered.
 */
export function ServicesChrome({ children }: { children: ReactNode }) {
  const startTourRef = useRef<(() => void) | null>(null);

  const handleTourReady = useCallback((start: () => void) => {
    startTourRef.current = start;
  }, []);

  return (
    <>
      <TopNav
        showBack
        backHref="/"
        title="Dịch vụ"
        showHelp
        onHelpClick={() => startTourRef.current?.()}
      />

      {children}

      <ServicesTour onReady={handleTourReady} />
    </>
  );
}
