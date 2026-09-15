"use client";

import { useState, useEffect } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopTopBar } from "./DesktopTopBar";

const SIDEBAR_WIDTH_FULL = 240; // w-60
const SIDEBAR_WIDTH_COLLAPSED = 64; // w-16
const TOPBAR_HEIGHT = 64; // h-16

/**
 * Desktop shell — wraps page content with a fixed sidebar and top bar.
 * Reads the sidebar's collapsed state via a shared CSS variable so the top
 * bar and content area adjust in sync without prop drilling.
 *
 * The shell is only rendered when x-device-class === "desktop" (server-side
 * gate in layout.tsx), so mobile never pays for these extra DOM nodes.
 */
export function DesktopShell({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_WIDTH_FULL);

  // Observe sidebar width changes via a MutationObserver on the sidebar
  // element's class (the collapse toggle flips between w-60 and w-16).
  useEffect(() => {
    const sidebar = document.querySelector("aside");
    if (!sidebar) return;

    const observer = new MutationObserver(() => {
      const w = sidebar.classList.contains("w-16")
        ? SIDEBAR_WIDTH_COLLAPSED
        : SIDEBAR_WIDTH_FULL;
      setSidebarWidth(w);
    });

    observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-surface-container-low">
      <DesktopSidebar />
      <DesktopTopBar sidebarWidth={sidebarWidth} />

      {/* Content area — offset by sidebar + topbar */}
      <main
        className="transition-[margin-left] duration-200"
        style={{
          marginLeft: sidebarWidth,
          paddingTop: TOPBAR_HEIGHT,
        }}
      >
        <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
