import QueryProvider from "@/components/providers/QueryProvider";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "NoobStore Admin",
	description: "Admin management for NoobStore",
};

const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem("admin-theme");
    if (theme === "dark" || (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
			</head>
			<body className="antialiased">
				<QueryProvider>{children}</QueryProvider>
			</body>
		</html>
	);
}
