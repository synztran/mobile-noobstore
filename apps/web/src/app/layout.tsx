import { ReactQueryProvider } from "@/components/ui/ReactQueryProvider";
import { ServiceWorkerRegister } from "@/components/ui/ServiceWorkerRegister";
import { StoreHydrator } from "@/components/ui/StoreHydrator";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { FlyToCart } from "@/modules/cart/ui/FlyToCart";
import { CookieConsentLazy } from "@/components/ui/CookieConsentLazy";
import { GoogleAnalytics } from "@/components/ui/GoogleAnalytics";
import { BetterStackRUM } from "@/components/ui/BetterStackRUM";
import { AuthProvider } from "@/modules/user/client/AuthProvider";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

const manrope = localFont({
  src: "../../public/fonts/manrope/Manrope-VariableFont_wght.woff2",
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
  viewportFit: "cover",
  themeColor: "#9b3f1c",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
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
        <meta property="fb:app_id" content={process.env.FB_APP_ID} />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <GoogleAnalytics nonce={nonce} />
        <BetterStackRUM nonce={nonce} />
        <noscript>
          <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
            <h2>Vui lòng bật JavaScript</h2>
            <p>NoobStore cần JavaScript để hoạt động. Vui lòng bật JavaScript trong trình duyệt của bạn.</p>
          </div>
        </noscript>
      </head>
      <body className="bg-background font-sans text-on-surface antialiased">
        <a
          href="#main-layout"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg"
        >
          Chuyển đến nội dung chính
        </a>
        <ReactQueryProvider>
          <AuthProvider>
            <FlyToCart />
            {children}
            <ToastProvider />
            <CookieConsentLazy />
            <StoreHydrator />
            <ServiceWorkerRegister />
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
