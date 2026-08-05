import { ReactQueryProvider } from "@/components/ui/ReactQueryProvider";
import { RouteChangeTracker } from "@/components/ui/RouteChangeTracker";
import { ServiceWorkerRegister } from "@/components/ui/ServiceWorkerRegister";
import { StoreHydrator } from "@/components/ui/StoreHydrator";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { FlyToCart } from "@/components/ui/FlyToCart";
import { NavigationOverlay } from "@/components/layout/NavigationOverlay";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import "gooey-toast/styles.css";
import "react-wheel-scroller/styles.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import "./globals.css";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

const MobileViewportGuard = dynamic(
  () => import("@/components/warning-modal/MobileViewportGuard")
);

const manrope = localFont({
  src: "../../public/fonts/manrope/Manrope-VariableFont_wght.ttf",
  variable: "--font-sans",
  display: "swap",
  weight: "200 800",
});

export const metadata: Metadata = {
  title: {
    template: "%s - NoobStore",
    default: "NoobStore",
  },
  description: "Service and Retail for Premium Mechanical Keyboards",
  metadataBase: new URL("https://www.noobstore.xyz"),
  openGraph: {
    type: "website",
    siteName: "NoobStore",
    title: "NoobStore",
    description: "Service and Retail for Premium Mechanical Keyboards",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  other: {},
  twitter: {
    card: "summary_large_image",
    title: "NoobStore",
    description: "Service and Retail for Premium Mechanical Keyboards",
    images: ["/icon-512.png"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "NoobStore",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#9b3f1c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="noobstore"
      className={cn("font-sans", manrope.variable)}
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <meta
          name="facebook-domain-verification"
          content="ouaw36c71sgi4fz07lkj2t0ot3kb3d"
        />
        <meta property="fb:app_id" content="2148494311891572" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, viewport-fit=cover"
        />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="bg-background font-sans text-on-surface antialiased">
        <ReactQueryProvider>
          <AuthProvider>
            <NavigationOverlay />
            <FlyToCart />
            <Suspense fallback={null}>
              <RouteChangeTracker />
            </Suspense>
            {children}
            <MobileViewportGuard />
            <ToastProvider />
            <StoreHydrator />
            <ServiceWorkerRegister />
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
