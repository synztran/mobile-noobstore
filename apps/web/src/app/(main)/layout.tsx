import { CartHydrator } from "@/modules/cart/ui/CartHydrator";
import { BottomNav } from "@/components/layout/BottomNav";
import { MainContent } from "@/components/layout/MainContent";
import { TopNavGate } from "@/components/layout/TopNavGate";
import { MainLayoutDynamic } from "@/components/layout/MainLayoutDynamic";

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<CartHydrator />
			<TopNavGate />
			<MainContent>{children}</MainContent>
			<BottomNav />
			<MainLayoutDynamic />
		</>
	);
}
