import { ReactQueryProvider } from "@/components/ui/ReactQueryProvider";
import { ServiceWorkerRegister } from "@/components/ui/ServiceWorkerRegister";
import { StoreHydrator } from "@/components/ui/StoreHydrator";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { NavigationOverlay } from "@/components/layout/NavigationOverlay";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import "gooey-toast/styles.css";
import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";

const MobileViewportGuard = dynamic(
  () => import("@/components/warning-modal/MobileViewportGuard"),
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
	other: {
		"fb:app_id": "YOUR_FB_APP_ID", // replace with real Facebook App ID
	},
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
		<html lang="en" data-theme="noobstore" className={cn("font-sans", manrope.variable)}>
			<body className="bg-background font-sans text-on-surface antialiased">
				<AuthProvider>
					<ReactQueryProvider>
						<NavigationOverlay />
						{children}
						<MobileViewportGuard />
						<ToastProvider />
						<StoreHydrator />
						<ServiceWorkerRegister />
					</ReactQueryProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
