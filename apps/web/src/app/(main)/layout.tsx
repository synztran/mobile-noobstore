import { headers } from "next/headers";
import { CartHydrator } from "@/modules/cart/ui/CartHydrator";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileCartDrawerMount } from "@/components/layout/MobileCartDrawerMount";
import { MainContent } from "@/components/layout/MainContent";
import { TopNavGate } from "@/components/layout/TopNavGate";
import { MainLayoutDynamic } from "@/components/layout/MainLayoutDynamic";
import { SplashScreen } from "@/components/splash/SplashScreen";
import { PageTransitionLoader } from "@/components/splash/PageTransitionLoader";
import { DesktopShell } from "@/modules/desktop/ui/shell/DesktopShell";
import { DesktopCartDrawerMount } from "@/modules/desktop/ui/cart/DesktopCartDrawerMount";
import type { DeviceClass } from "@/modules/desktop/types";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const deviceClass = (h.get("x-device-class") as DeviceClass) || "mobile";
  const isDesktop = deviceClass === "desktop";

  return (
    <>
      <CartHydrator />

      {/* Two loaders by ownership: SplashScreen plays only on the home route,
          while PageTransitionLoader supplies the light "Đang chuyển trang"
          overlay for every other page (cold loads, nested and isolated
          redirects alike). Both skip /gacha-mega, which renders its own
          loading screen. */}
      {isDesktop ? (
        <SplashScreen forceShow>
          <DesktopShell>
            <PageTransitionLoader>{children}</PageTransitionLoader>
          </DesktopShell>
        </SplashScreen>
      ) : (
        <>
          <TopNavGate />
          <SplashScreen forceShow>
            <MainContent>
              <PageTransitionLoader>{children}</PageTransitionLoader>
            </MainContent>
          </SplashScreen>
          <BottomNav />
        </>
      )}

      {isDesktop ? <DesktopCartDrawerMount /> : <MobileCartDrawerMount />}

      <MainLayoutDynamic hideSearch={isDesktop} />
    </>
  );
}
