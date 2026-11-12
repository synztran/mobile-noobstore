import { DesktopTopBar } from "./DesktopTopBar";

const TOPBAR_HEIGHT = 64; // h-16

/**
 * Desktop shell — a conventional storefront frame: full-width sticky top bar
 * (logo + primary nav + search + account actions) over a centred content
 * column. The old left rail was removed because two navigation layers ate
 * horizontal space and pushed the storefront into a mobile-column layout.
 *
 * Only rendered when x-device-class === "desktop" (server-side gate in
 * layout.tsx), so mobile never pays for these extra DOM nodes.
 */
export function DesktopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-container-low">
      <DesktopTopBar />

      <main style={{ paddingTop: TOPBAR_HEIGHT }}>
        <div className="mx-auto w-full max-w-[1360px] px-4 pt-6 lg:px-8 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
