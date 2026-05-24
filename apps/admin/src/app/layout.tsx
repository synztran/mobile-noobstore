import QueryProvider from "@/components/providers/QueryProvider";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Huy Store Admin",
	description: "Admin management for Huy Store",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className="antialiased">
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	);
}
