import { CartDrawer } from "@/components/cart/CartDrawer";
import { BottomNav } from "@/components/layout/BottomNav";
import { MainContent } from "@/components/layout/MainContent";
import { TopNav } from "@/components/layout/TopNav";

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<TopNav />
			<MainContent>{children}</MainContent>
			<BottomNav />
			<CartDrawer />
		</>
	);
}
