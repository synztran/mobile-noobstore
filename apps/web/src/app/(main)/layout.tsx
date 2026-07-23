import { CartHydrator } from "@/components/ui/CartHydrator";
import { BottomNav } from "@/components/layout/BottomNav";
import { MainContent } from "@/components/layout/MainContent";
import { TopNav } from "@/components/layout/TopNav";
import { MainLayoutDynamic } from "@/components/layout/MainLayoutDynamic";

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<CartHydrator />
			<TopNav />
			<MainContent>{children}</MainContent>
			<BottomNav />
			<MainLayoutDynamic />
		</>
	);
}
