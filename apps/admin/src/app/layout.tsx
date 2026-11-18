import QueryProvider from "@/components/providers/QueryProvider";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "NoobStore Admin",
	description: "Admin management for NoobStore",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="antialiased">
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	);
}