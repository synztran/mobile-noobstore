import { headers } from "next/headers";
import { CartHydrator } from "@/modules/cart/ui/CartHydrator";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileCartDrawerMount } from "@/components/layout/MobileCartDrawerMount";
import { MainContent } from "@/components/layout/MainContent";
import { TopNavGate } from "@/components/layout/TopNavGate";
import { MainLayoutDynamic } from "@/components/layout/MainLayoutDynamic";
import { SplashScreen } from "@/components/splash/SplashScreen";
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

      {isDesktop ? (
        <SplashScreen forceShow>
          <DesktopShell>{children}</DesktopShell>
        </SplashScreen>
      ) : (
        <>
          <TopNavGate />
          <SplashScreen forceShow>
            <MainContent>{children}</MainContent>
          </SplashScreen>
          <BottomNav />
        </>
      )}

      {isDesktop ? <DesktopCartDrawerMount /> : <MobileCartDrawerMount />}

      <MainLayoutDynamic hideSearch={isDesktop} />
    </>
  );
}
